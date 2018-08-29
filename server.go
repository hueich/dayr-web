package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
)

var (
	host   = flag.String("host", "localhost:8080", "Host to serve for")
	port   = flag.Int("port", 8080, "Server port")
	wwwDir = flag.String("wwwdir", "www", "Directory to serve")
)

type filterHostHandler struct {
	Host    string
	Handler http.Handler
}

func (h *filterHostHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Host != h.Host {
		http.NotFound(w, r)
		return
	}
	h.Handler.ServeHTTP(w, r)
}

func main() {
	flag.Parse()

	log.Printf("Starting to listen on port %d serving host %s", *port, *host)
	// TODO: Use TLS.
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%d", *port), &filterHostHandler{*host, http.FileServer(http.Dir(*wwwDir))}))
}
