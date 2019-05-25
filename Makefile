GOPATH=$(shell go env GOPATH)
GOBIN=$(GOPATH)/bin

bundle: $(GOBIN)/esc
	cd ./ui && $(GOBIN)/esc -o ../pkg/ui/static.go -pkg ui -private .

# Dependencies

$(GOBIN)/esc:
	go get -u -f github.com/mjibson/esc
