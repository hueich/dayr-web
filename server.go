package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"regexp"
	"strings"
)

var (
	hosts  = flag.String("hosts", "", "One or more comma-separated hosts to serve for")
	port   = flag.Int("port", 8080, "Server port")
	wwwDir = flag.String("wwwdir", "www", "Directory to serve")

	regexAllowedIP = regexp.MustCompile(`^(127\.0\.0\.1|(192\.168|10\.\d+)\.\d+.\d+)$`)
)

type filterHostHandler struct {
	Hosts   []string
	Handler http.Handler
}

func (h *filterHostHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	for _, host := range h.Hosts {
		if r.Host == host {
			h.Handler.ServeHTTP(w, r)
			return
		}
	}
	hostParts := strings.Split(r.Host, ":")
	// TODO: Handle IPv6 addresses.
	if hostParts[0] == "localhost" || regexAllowedIP.MatchString(hostParts[0]) {
		h.Handler.ServeHTTP(w, r)
		return
	}
	http.NotFound(w, r)
}

func main() {
	flag.Parse()

	hs := strings.Split(*hosts, ",")
	log.Printf("Starting to listen on port=%d serving hosts=%s using directory=%s", *port, strings.Join(hs, ","), *wwwDir)
	// TODO: Use TLS.
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%d", *port), &filterHostHandler{hs, http.FileServer(http.Dir(*wwwDir))}))
}
