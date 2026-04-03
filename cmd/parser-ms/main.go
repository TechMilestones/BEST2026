package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	logparser "hackaton-test/log-parser"
	"io"
	"net/http"
	"os"
	"os/signal"
	"time"
)

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

	queries := r.URL.Query()
	file_name := queries.Get("file_name")
	if file_name == "" {
		JSONErrorResp(w, http.StatusBadRequest, "Error reading file name")
		return
	}

	f, _, err := r.FormFile(file_name)
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

	// Call to python server to get full data
	resp, err := http.Post("http://localhost:8081", "application/json", data_reader)
	if err != nil {
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
	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", healthHandler)
	mux.HandleFunc("POST /upload-log", uploadLogHandler)

	server := &http.Server{
		Addr:    ":8080",
		Handler: mux,
	}

	go func() {
		if err := server.ListenAndServe(); err != nil {
			panic(err)
		}
	}()

	terminationChan := make(chan os.Signal, 1)
	signal.Notify(terminationChan, os.Interrupt)

	<-terminationChan

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		panic(err)
	}
}
