package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	logparser "hackaton-test/log-parser"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"time"

	"github.com/joho/godotenv"
)

func enableCors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", os.Getenv("CORS_ALLOW_ORIGIN"))
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})

}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}

func JSONErrorResp(w http.ResponseWriter, status int, err_msg string) {
	w.WriteHeader(status)
	fmt.Fprintf(w, `{"error": "%s"}`, err_msg)
}

func uploadLogHandler(w http.ResponseWriter, r *http.Request) {
	// Set the maximum size of the request body to 10 MiB
	r.ParseMultipartForm(10 << 20)

	f, _, err := r.FormFile("file")
	if err != nil {
		JSONErrorResp(w, http.StatusBadRequest, "Error reading file")
		return
	}

	// File is closed by the logparser.Parse function
	// not the best practice but it should works
	data, err := logparser.Parse(f)
	if err != nil {
		JSONErrorResp(w, http.StatusInternalServerError, "Error parsing log")
		return
	}

	data_str, err := json.Marshal(&data)

	data_reader := bytes.NewReader(data_str)

	pyport := os.Getenv("PYTHON_SERVICE_PORT")
	if pyport == "" {
		pyport = "8888"
	}

	// Call to python server to get full data
	// later there will be env for this
	resp, err := http.Post(fmt.Sprintf("http://localhost:%s/api/process", pyport), "application/json", data_reader)
	if err != nil {
		JSONErrorResp(w, http.StatusInternalServerError, "Error posting data")
		return
	}

	if resp.StatusCode != http.StatusOK {
		JSONErrorResp(w, http.StatusInternalServerError, "Error posting data")
		return
	}

	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		JSONErrorResp(w, http.StatusInternalServerError, "Error reading response")
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write(body)
}

func main() {
	if err := godotenv.Load("ports.env", ".env"); err != nil {
		log.Println("No env file found, using default port 8080")
	}

	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/gms/health", healthHandler)
	mux.HandleFunc("POST /api/upload-log", uploadLogHandler)

	port := os.Getenv("GO_SERVICE_PORT")
	if port == "" {
		port = "8080"
	}
	server := &http.Server{
		Addr:    ":" + port,
		Handler: enableCors(mux),
	}

	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			panic(err)
		}
		fmt.Println("Server stopped")
	}()

	fmt.Println("Server is running on port " + port)

	terminationChan := make(chan os.Signal, 1)
	signal.Notify(terminationChan, os.Interrupt)

	<-terminationChan

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		panic(err)
	}
}
