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
	"strings"
	"time"

	"github.com/joho/godotenv"
)

func enableCors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Println("CORS request")
		allowedOrigin := os.Getenv("CORS_ALLOW_ORIGIN")
		origin := r.Header.Get("Origin")

		if allowedOrigin == "" || allowedOrigin == "*" {
			if origin != "" {
				w.Header().Set("Access-Control-Allow-Origin", origin)
			} else {
				w.Header().Set("Access-Control-Allow-Origin", "*")
			}
		} else {
			origins := strings.Split(allowedOrigin, ",")
			isAllowed := false
			for _, o := range origins {
				if strings.TrimSpace(o) == origin {
					isAllowed = true
					break
				}
			}
			if isAllowed {
				w.Header().Set("Access-Control-Allow-Origin", origin)
			} else {
				// Fallback to the first origin or keep it as is if not matched
				// browsers will block if it doesn't match
				w.Header().Set("Access-Control-Allow-Origin", strings.TrimSpace(origins[0]))
			}
		}

		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	log.Println("Health check request")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}

func JSONErrorResp(w http.ResponseWriter, status int, err_msg string) {
	w.WriteHeader(status)
	fmt.Fprintf(w, `{"error": "%s"}`, err_msg)
}

func uploadLogHandler(w http.ResponseWriter, r *http.Request) {
	const maxUploadSize = 100 << 20 // 100 MiB

	log.Println("Uploading file...")

	// Hard-limit upload body size to avoid unbounded memory/disk usage.
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)
	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		if strings.Contains(err.Error(), "http: request body too large") {
			JSONErrorResp(w, http.StatusRequestEntityTooLarge, "File is too large. Max upload size is 100 MiB")
			return
		}

		log.Println("Error parsing multipart form:", err)
		JSONErrorResp(w, http.StatusBadRequest, "Invalid multipart form data")
		return
	}

	f, _, err := r.FormFile("file")
	if err != nil {
		log.Println("Error reading file:", err)
		JSONErrorResp(w, http.StatusBadRequest, "Error reading file")
		return
	}

	// File is closed by the logparser.Parse function
	// not the best practice but it should works
	data, err := logparser.Parse(f)
	if err != nil {
		log.Println("Error parsing log:", err)
		JSONErrorResp(w, http.StatusInternalServerError, "Error parsing log")
		return
	}

	log.Println("Data parsed")

	if len(data.GPS) == 0 && len(data.IMU) == 0 && len(data.ATT) == 0 {
		log.Println("No data found in log")
		JSONErrorResp(w, http.StatusUnprocessableEntity, "No data found in log or incorrect log format")
		return
	}

	data_str, err := json.Marshal(&data)
	if err != nil {
		log.Println("Error marshalling data:", err)
		JSONErrorResp(w, http.StatusInternalServerError, "Error marshalling data")
		return
	}

	data_reader := bytes.NewReader(data_str)

	pyhost := os.Getenv("PYTHON_SERVICE_HOST")
	if pyhost == "" {
		pyhost = "localhost"
	}

	pyport := os.Getenv("PYTHON_SERVICE_PORT")
	if pyport == "" {
		pyport = "8888"
	}

	pyURL := fmt.Sprintf("http://%s:%s/api/process", pyhost, pyport)
	log.Println("Sending data to python server at", pyURL)

	// Call to python server to get full data
	resp, err := http.Post(pyURL, "application/json", data_reader)
	if err != nil {
		log.Printf("Error posting data to python server at %s: %v\n", pyURL, err)
		JSONErrorResp(w, http.StatusInternalServerError, "Error posting data")
		return
	}

	fmt.Println("Response status code:", resp.StatusCode)

	if resp.StatusCode != http.StatusOK {
		log.Println("Error posting data to python server:", resp.StatusCode)
		JSONErrorResp(w, http.StatusInternalServerError, "Error posting data")
		return
	}

	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Println("Error reading response from python server:", err)
		JSONErrorResp(w, http.StatusInternalServerError, "Error reading response")
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write(body)
}

func main() {
	if err := godotenv.Load(".env"); err != nil {
		log.Println("No env file found, using default port")
	}

	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/gms/health", healthHandler)
	mux.HandleFunc("POST /api/upload-log", uploadLogHandler)

	port := os.Getenv("GO_SERVICE_PORT")
	if port == "" {
		port = "5000"
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
