var app = new Vue({
  el: "#app",
  data: {
    action: "query",
    q: "",
    from: "5 minutes",
    fromAt: "",
    to: "now",
    toAt: "",
    regex: false,

    isLoading: false,
    lines: [],

    fetchController: null,
    stream: null,
    streamLeft: "",
    autoScroll: true,
  },
  methods: {
    setStream: function () {
      this.action = "stream"
      this.pushHistory()
    },
    setQuery: function () {
      this.action = "query"
      this.pushHistory()
    },
    abortRequest: function () {
      if (this.stream) {
        this.stream.cancel()
      }
      if (this.fetchController) {
        this.fetchController.abort()
        this.fetchController = null
      }
      this.isLoading = false
    },
    doRequest: function () {
      this.lines = []

      var endpoint = ""

      switch (this.action) {
        case "query":
          endpoint = this.queryEndpoint + "?" + this.fullQuery()
          break
        case "stream":
          endpoint = this.streamEndpoint + "?" + this.fullQuery()
          break
        default:
          throw new Error("Unknown action")
      }

      var self = this

      this.isLoading = true
      var read = function () {
        var decoder = new TextDecoder()

        self.stream.read().then(function (result) {
          if (!result.done) {
            var raw = self.streamLeft.concat(decoder.decode(result.value, {stream: true}))
            var lines = raw.split("\n")

            self.streamLeft = lines.pop()
            self.lines.push.apply(self.lines, lines.map(function (v) {

              var s = v.split(" ", 1)
              var ulid = s[0]
              var text = v
              .replace(ulid + " ", "")
              .split("\\n")
              .join("\n")

              try {
                var time = self.decodeUlid(ulid)
              } catch (e) {
                return {time: "now", text: v}
              }

              return {ulid: ulid, time: time, text: text, showUlid: false}
            }))
            read()
            return
          }

          self.streamLeft = ""
          self.stream = null
          self.isLoading = false
        })
      }

      this.fetchController = new AbortController()
      fetch(endpoint, {signal: this.fetchController.signal}).then(function (r) {
        self.stream = r.body.getReader()
        read()
      }).catch(function (e) {
        console.error(e)
        self.isLoading = false
      })
    },
    fullQuery: function () {
      var query = "q=" + this.q
      if (!!this.regex) {
        query += "&regex=" + this.regex
      }
      if (this.action === "query") {
        query += "&from=" + this.fromPrepare() + "&to=" + this.toPrepare()
      }
      return query
    },
    fromPrepare: function () {
      switch (this.from) {
        case "at":
          return moment(this.fromAt).toISOString() ? moment(this.fromAt).toISOString() : this.fromAt
        default:
          return moment(this.from).toISOString()
      }
    },
    toPrepare: function () {
      switch (this.to) {
        case "at":
          return moment(this.toAt).toISOString() ? moment(this.toAt).toISOString() : this.toAt
        case "now":
          return moment().toISOString()
        default:
          return moment(this.to).toISOString()
      }
    },
    pushHistory: function () {
      document.title = "OKLOG"
      if (this.q !== "") {
        document.title = "OKLOG - " + this.q
      }

      var query = "action=" + this.action + "&q=" + this.q
      if (!!this.regex) {
        query += "&regex=" + this.regex
      }
      query += "&from=" + this.from + "&to=" + this.to
      query += "&fromAt=" + this.fromAt + "&toAt=" + this.toAt
      history.pushState("", document.title, "#" + query)
    },
    decodeUlid: function (id) {
      var ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ" // Crockford's Base32
      var ENCODING_LEN = ENCODING.length
      var TIME_MAX = Math.pow(2, 48) - 1
      var TIME_LEN = 10
      var RANDOM_LEN = 16

      if (id.length !== TIME_LEN + RANDOM_LEN) {
        throw new Error("malformed ulid")
      }
      var time = id
      .substr(0, TIME_LEN)
      .split("")
      .reverse()
      .reduce(function (carry, char, index) {
        var encodingIndex = ENCODING.indexOf(char)
        if (encodingIndex === -1) {
          throw new Error("invalid character found: " + char)
        }
        return (carry += encodingIndex * Math.pow(ENCODING_LEN, index))
      }, 0)

      if (time > TIME_MAX) {
        throw new Error("malformed ulid, timestamp too large")
      }
      return time
    },
    toTop: function () {
      window.scrollTo(0, 0)
    },
  },
  computed: {
    baseEndpoint: function () {
      return window.location.protocol + "//" + window.location.host
    },
    queryEndpoint: function () {
      return this.baseEndpoint + "/store/query"
    },
    streamEndpoint: function () {
      return this.baseEndpoint + "/store/stream"
    },
  },
  watch: {
    action: function () {
      this.pushHistory()
    },
    q: function () {
      this.pushHistory()
    },
    from: function () {
      this.pushHistory()
    },
    to: function () {
      this.pushHistory()
    },
    fromAt: function () {
      this.pushHistory()
    },
    toAt: function () {
      this.pushHistory()
    },
    regex: function () {
      this.pushHistory()
    },
    lines: function () {
      if (this.autoScroll) {
        this.$nextTick(function () {
          var maxH = document.body.scrollHeight
          window.scrollTo(0, maxH)
          this.autoScroll = true
        })
      }
    },
  },
  mounted: function () {
    var self = this
    window.addEventListener("scroll", function (ev) {
      var maxH = document.body.scrollHeight
      self.autoScroll = window.innerHeight > maxH || (window.scrollY + window.innerHeight) >= maxH
    })
  },
})

// handle routing
function onHashChange() {
  var hash = window.location.hash.replace(/#\/?/, "")
  var params = hash.split("&")
  params.forEach(function (p) {
    var ps = p.split("=")
    var key = ps[0]
    var value = ps[1]

    if (value === "") {
      return
    }

    app[key] = decodeURIComponent(value)
  })

  app.$nextTick(
    function () {
      // call request
      app.doRequest()
    }
  )
}

window.addEventListener("hashchange", onHashChange)
onHashChange()
