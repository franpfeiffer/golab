package handler

import (
	"fmt"
	"html/template"
	"io"
	"log"
	"net/http"

	"golab/internal/executor"
)

var defaultCode = `package main

import "fmt"

func main() {
	fmt.Println("Hello, GoLab!")
}
`

func HandleIndex(w http.ResponseWriter, r *http.Request) {
	tmpl, err := template.ParseFiles("templates/index.html")
	if err != nil {
		log.Printf("Error parsing template: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	
	err = tmpl.Execute(w, map[string]interface{}{
		"DefaultCode": defaultCode,
	})
	if err != nil {
		log.Printf("Error executing template: %v", err)
	}
}

func HandleRun(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		log.Printf("Invalid method: %s", r.Method)
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("Error reading request body: %v", err)
		http.Error(w, "Error reading request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()
	
	code := string(bodyBytes)
	
	if code == "" {
		log.Printf("No code provided")
		http.Error(w, "No code provided", http.StatusBadRequest)
		return
	}

	output, err := executor.ExecuteGoCode(code)
	
	w.Header().Set("Content-Type", "text/plain")
	if err != nil {
		errorMsg := fmt.Sprintf("Error: %s", err.Error())
		log.Printf("Execution error: %v", err)
		w.Write([]byte(errorMsg))
		return
	}
	
	w.Write([]byte(output))
}
