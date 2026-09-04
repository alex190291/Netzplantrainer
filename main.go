package main

import (
	"context"
	"embed"
	"errors"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"runtime"
	"time"
)

const defaultPort = 4200

// webAssets contains everything needed by the browser. Keeping the list
// explicit prevents development files from accidentally ending up in builds.
//
//go:embed index.html app.js styles.css
var webAssets embed.FS

func main() {
	port := flag.Int("port", defaultPort, "local port to use (0 chooses a free port)")
	noBrowser := flag.Bool("no-browser", false, "do not open the browser automatically")
	flag.Parse()

	if *port < 0 || *port > 65535 {
		log.Fatalf("invalid port %d: expected a value from 0 to 65535", *port)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()

	if err := run(ctx, *port, !*noBrowser); err != nil {
		log.Fatal(err)
	}
}

func run(ctx context.Context, port int, launchBrowser bool) error {
	listener, err := listen(port)
	if err != nil {
		return err
	}
	defer listener.Close()

	actualPort := listener.Addr().(*net.TCPAddr).Port
	address := fmt.Sprintf("http://127.0.0.1:%d/", actualPort)
	server := &http.Server{
		Handler:           appHandler(),
		ReadHeaderTimeout: 5 * time.Second,
	}

	serveErr := make(chan error, 1)
	go func() {
		serveErr <- server.Serve(listener)
	}()

	fmt.Printf("Netzplan Trainer läuft unter %s\n", address)
	fmt.Println("Zum Beenden dieses Fenster schließen oder Strg+C drücken.")
	if launchBrowser {
		if err := openBrowser(address); err != nil {
			fmt.Fprintf(os.Stderr, "Browser konnte nicht automatisch geöffnet werden: %v\n", err)
		}
	}

	select {
	case err := <-serveErr:
		if !errors.Is(err, http.ErrServerClosed) {
			return fmt.Errorf("HTTP server stopped: %w", err)
		}
		return nil
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		return server.Shutdown(shutdownCtx)
	}
}

func listen(port int) (net.Listener, error) {
	address := fmt.Sprintf("127.0.0.1:%d", port)
	listener, err := net.Listen("tcp", address)
	if err == nil {
		return listener, nil
	}

	// The default is a convenience, not a requirement. If another program is
	// using it, choose a free port so double-clicking the app still works.
	if port == defaultPort {
		listener, fallbackErr := net.Listen("tcp", "127.0.0.1:0")
		if fallbackErr == nil {
			return listener, nil
		}
	}

	return nil, fmt.Errorf("cannot listen on %s: %w", address, err)
}

func appHandler() http.Handler {
	files := http.FileServer(http.FS(webAssets))
	return http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		if request.Method != http.MethodGet && request.Method != http.MethodHead {
			response.Header().Set("Allow", "GET, HEAD")
			http.Error(response, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		response.Header().Set("Cache-Control", "no-cache")
		response.Header().Set("X-Content-Type-Options", "nosniff")
		files.ServeHTTP(response, request)
	})
}

func openBrowser(address string) error {
	var command *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		command = exec.Command("rundll32", "url.dll,FileProtocolHandler", address)
	case "darwin":
		command = exec.Command("open", address)
	default:
		command = exec.Command("xdg-open", address)
	}

	if err := command.Start(); err != nil {
		return err
	}
	return command.Process.Release()
}

// Ensure the embedded file system still implements fs.FS if its declaration
// is changed in the future.
var _ fs.FS = webAssets
