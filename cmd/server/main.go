package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"golab/internal/handler"
)

func main() {
	tempDir := filepath.Join(os.TempDir(), "golab")
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		log.Fatalf("Failed to create temp directory: %v", err)
	}

	fs := http.FileServer(http.Dir("static"))
	http.Handle("/static/", http.StripPrefix("/static/", fs))
	http.HandleFunc("/", handler.HandleIndex)
	http.HandleFunc("/run", handler.HandleRun)

	port := os.Getenv("PORT")
	if port == "" {
		port = "42069"
	}

	fmt.Printf("Server running at http://localhost:%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
