package executor

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

const (
	executionTimeout = 5 * time.Second
)

func ExecuteGoCode(code string) (string, error) {
	tmpDir, err := os.MkdirTemp("", "goplay")
	if err != nil {
		return "", fmt.Errorf("failed to create temp directory: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	tmpFile := filepath.Join(tmpDir, "main.go")
	if err := os.WriteFile(tmpFile, []byte(code), 0644); err != nil {
		return "", fmt.Errorf("failed to write code to file: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), executionTimeout)
	defer cancel()
	
	cmd := exec.CommandContext(ctx, "go", "run", tmpFile)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	
	err = cmd.Run()
	
	if err != nil {
		if stderr.Len() > 0 {
			return "", fmt.Errorf("%s", stderr.String())
		}
		return "", fmt.Errorf("execution error: %v", err)
	}
	
	return stdout.String(), nil
}
