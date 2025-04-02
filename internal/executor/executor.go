package executor

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"time"
)

const (
	executionTimeout = 10 * time.Second
	compileTimeout   = 5 * time.Second
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

	if err := compileCode(tmpDir, tmpFile); err != nil {
		return "", err
	}

	return runBinary(tmpDir)
}

func compileCode(tmpDir, srcFile string) error {
	ctx, cancel := context.WithTimeout(context.Background(), compileTimeout)
	defer cancel()

	outputBinary := filepath.Join(tmpDir, "program")
	if runtime.GOOS == "windows" {
		outputBinary += ".exe"
	}

	cmd := exec.CommandContext(ctx, "go", "build",
		"-gcflags=-N", // Disable optimizations for faster compile
		"-o", outputBinary,
		srcFile)

	cmd.Dir = tmpDir
	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		if stderr.Len() > 0 {
			return fmt.Errorf("compilation error: %s", stderr.String())
		}
		if ctx.Err() == context.DeadlineExceeded {
			return fmt.Errorf("compilation timed out after %v seconds", compileTimeout.Seconds())
		}
		return fmt.Errorf("compilation failed: %v", err)
	}

	return nil
}

func runBinary(tmpDir string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), executionTimeout)
	defer cancel()

	binaryName := filepath.Join(tmpDir, "program")
	if runtime.GOOS == "windows" {
		binaryName += ".exe"
	}

	cmd := exec.CommandContext(ctx, binaryName)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	cmd.Dir = tmpDir

	err := cmd.Run()

	if err != nil {
		if stderr.Len() > 0 {
			return "", fmt.Errorf("execution error: %s", stderr.String())
		}
		if ctx.Err() == context.DeadlineExceeded {
			return "", fmt.Errorf("execution timed out after %v seconds", executionTimeout.Seconds())
		}
		return "", fmt.Errorf("execution error: %v", err)
	}

	return stdout.String(), nil
}

func QuickExecuteGoCode(code string) (string, error) {
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

	cmd := exec.CommandContext(ctx, "go", "run", "-gcflags=-N", tmpFile)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err = cmd.Run()

	if err != nil {
		if stderr.Len() > 0 {
			return "", fmt.Errorf("%s", stderr.String())
		}
		if ctx.Err() == context.DeadlineExceeded {
			return "", fmt.Errorf("execution timed out after %v seconds", executionTimeout.Seconds())
		}
		return "", fmt.Errorf("execution error: %v", err)
	}

	return stdout.String(), nil
}
