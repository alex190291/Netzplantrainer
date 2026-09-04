package main

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestAppHandlerServesEmbeddedApp(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/", nil)
	response := httptest.NewRecorder()

	appHandler(nil).ServeHTTP(response, request)

	result := response.Result()
	defer result.Body.Close()
	body, err := io.ReadAll(result.Body)
	if err != nil {
		t.Fatal(err)
	}
	if result.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want %d", result.StatusCode, http.StatusOK)
	}
	if !strings.Contains(string(body), "Netzplan Trainer") {
		t.Fatal("response does not contain the embedded app")
	}
}

func TestAppHandlerRejectsChanges(t *testing.T) {
	request := httptest.NewRequest(http.MethodPost, "/", nil)
	response := httptest.NewRecorder()

	appHandler(nil).ServeHTTP(response, request)

	if response.Code != http.StatusMethodNotAllowed {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusMethodNotAllowed)
	}
}

func TestLauncherCanRequestShutdown(t *testing.T) {
	shutdown := make(chan struct{}, 1)
	handler := appHandler(func() { shutdown <- struct{}{} })

	statusRequest := httptest.NewRequest(http.MethodGet, "/__launcher", nil)
	statusResponse := httptest.NewRecorder()
	handler.ServeHTTP(statusResponse, statusRequest)
	if statusResponse.Code != http.StatusOK || !strings.Contains(statusResponse.Body.String(), `"canQuit":true`) {
		t.Fatalf("unexpected launcher response: status=%d body=%q", statusResponse.Code, statusResponse.Body.String())
	}

	quitRequest := httptest.NewRequest(http.MethodPost, "/__quit", nil)
	quitRequest.Header.Set("X-Netzplan-Launcher", "quit")
	quitResponse := httptest.NewRecorder()
	handler.ServeHTTP(quitResponse, quitRequest)

	if quitResponse.Code != http.StatusAccepted {
		t.Fatalf("status = %d, want %d", quitResponse.Code, http.StatusAccepted)
	}
	select {
	case <-shutdown:
	default:
		t.Fatal("shutdown was not requested")
	}
}

func TestLauncherRejectsUntrustedShutdown(t *testing.T) {
	called := false
	request := httptest.NewRequest(http.MethodPost, "/__quit", nil)
	response := httptest.NewRecorder()

	appHandler(func() { called = true }).ServeHTTP(response, request)

	if response.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusForbidden)
	}
	if called {
		t.Fatal("untrusted request triggered shutdown")
	}
}
