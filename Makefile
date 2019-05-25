GOPATH=$(shell go env GOPATH)
GOBIN=$(GOPATH)/bin
VERSION=$(shell git describe --tags)
LDFLAGS=-ldflags="-X main.version=$VERSION -s -w"

all: linux darwin windows

linux: $(GOBIN)/xgo bundle
	xgo -targets linux/amd64 $(LDFLAGS) -dest dist ./cmd/oklog

darwin: $(GOBIN)/xgo bundle
	xgo -targets darwin/amd64 $(LDFLAGS) -dest dist ./cmd/oklog

windows: $(GOBIN)/xgo bundle
	xgo -targets windows/amd64 $(LDFLAGS) -dest dist ./cmd/oklog

bundle: $(GOBIN)/esc
	cd ./ui && $(GOBIN)/esc -o ../pkg/ui/static.go -pkg ui -private .

# Dependencies

$(GOBIN)/xgo:
	go get -u -f github.com/karalabe/xgo

$(GOBIN)/esc:
	go get -u -f github.com/mjibson/esc
