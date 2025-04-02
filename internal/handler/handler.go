package handler

import (
	"fmt"
	"html/template"
	"io"
	"log"
	"net/http"
	"strings"

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

	err = tmpl.Execute(w, map[string] any {
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

	var output string
	var execErr error

	if isSimpleCode(code) {
		output, execErr = executor.QuickExecuteGoCode(code)
	} else {
		output, execErr = executor.ExecuteGoCode(code)
	}

	w.Header().Set("Content-Type", "text/plain")
	if execErr != nil {
		errorMsg := fmt.Sprintf("Error: %s", execErr.Error())
		log.Printf("Execution error: %v", execErr)
		w.Write([]byte(errorMsg))
		return
	}

	w.Write([]byte(output))
}

func isSimpleCode(code string) bool {
	lines := strings.Split(code, "\n")
	if len(lines) < 30 {
		hasComplexImports := false
		inImportBlock := false

		for _, line := range lines {
			trimmedLine := strings.TrimSpace(line)

			if strings.HasPrefix(trimmedLine, "import (") {
				inImportBlock = true
				continue
			}

			if inImportBlock && trimmedLine == ")" {
				inImportBlock = false
				continue
			}

			if inImportBlock || strings.HasPrefix(trimmedLine, "import ") {
				if !strings.Contains(trimmedLine, "\"fmt\"") &&
				   !strings.Contains(trimmedLine, "\"strings\"") &&
				   !strings.Contains(trimmedLine, "\"time\"") &&
				   !strings.Contains(trimmedLine, "\"math\"") &&
				   !strings.Contains(trimmedLine, "\"os\"") {
					hasComplexImports = true
					break
				}
			}
		}

		return !hasComplexImports
	}

	return false
}
