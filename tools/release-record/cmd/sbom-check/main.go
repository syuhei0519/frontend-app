package main

import (
	release "core-platform/release-record"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"time"
)

func check() error {
	if len(os.Args) != 4 {
		return release.ErrRefused
	}
	read := func(p string) ([]byte, error) {
		f, e := os.Open(p)
		if e != nil {
			return nil, release.ErrRefused
		}
		defer f.Close()
		b, e := io.ReadAll(io.LimitReader(f, 32*1024*1024+1))
		if e != nil || len(b) > 32*1024*1024 {
			return nil, release.ErrRefused
		}
		return b, nil
	}
	b, e := read(os.Args[1])
	if e != nil {
		return e
	}
	r, e := read(os.Args[2])
	if e != nil {
		return e
	}
	p, e := release.ValidateSBOM(b, r, os.Args[3], time.Now().UTC())
	if e != nil {
		return e
	}
	return json.NewEncoder(os.Stdout).Encode(p)
}
func main() {
	if check() != nil {
		fmt.Fprintln(os.Stderr, "SBOM schema, identity or inventory rejected")
		os.Exit(1)
	}
}
