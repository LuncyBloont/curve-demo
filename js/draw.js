window.line_length = 0

/**
 * 
 * @param {string} num 
 */
function as_b_spline_order(num) {
    num = num + ""
    res = num.match(/^\s*([0-9]*\.[0-9]*|[0-9]+)\s*$/)
    if (res) {
        return parseInt(Math.max(1.0, Math.min(line_length - 1, parseInt(res[0]))))
    } else {
        return 0
    }
}

class Input {
    constructor() {
        /** @type {glm.vec2} */
        this.mousePos = glm.vec2(0.0, 0.0)

        /** @type {glm.vec2} */
        this.movement = glm.vec2(0.0, 0.0)

        /** @type {boolean} */
        this.mouseDown = false

        /** @type {glm.veq} */
        this.mouseDownPos = glm.vec2(0.0, 0.0)

        /** @type {boolean} */
        this.mouseUp = false

        /** @type {glm.veq} */
        this.mouseUpPos = glm.vec2(0.0, 0.0)

        /** @type {boolean} */
        this.mouseHold = false

        /** @type {number} */
        this.button = 0
    }
}

class Data {
    constructor() {
        /** @type {number} */
        this.cursorSize = 3.0

        /** @type {Array<glm.vec2>} */
        this.points = []

        if (localStorage.getItem("points_cache")) {
            let points = JSON.parse(localStorage.getItem("points_cache"))
            for (let p of points) {
                this.points.push(glm.vec2(p.x, p.y))
            }
        }

        /** @type {Array<glm.vec2>} */
        this.fakeLine = [glm.vec2(0.0, 0.0), glm.vec2(0.0, 0.0)]

        /** @type {glm.vec2} */
        this.dragOffset = glm.vec2(0.0, 0.0)

        /** @type {number} */
        this.moveId = -1

        /** @type {number} */
        this.hover = -1

        /** @type {number} */
        this.pushMode = 0

        /** @type {string} */
        this.curveType = ""

        if (localStorage.getItem("curve_type")) {
            this.curveType = localStorage.getItem("curve_type")
            document.getElementById(this.curveType).checked = true
        }

        /** @type {number} */
        this.length = 0.0

        /** @type {Array<glm.vec2>} */
        this.tmpArr = []

        /** @type {number} */
        this.order = 1.0

        /** @type {string} */
        this.orderId = ""

        if (localStorage.getItem("order") && localStorage.getItem("orderId")) {
            this.order = parseInt(localStorage.getItem("order"))
            this.orderId = localStorage.getItem("orderId")
            document.getElementById(this.orderId).value = this.order
        }
    }
}

/**
 * 
 * @param {Input} input 
 * @param {Data} data 
 */
function update(input, data) {
    data.cursorSize = glm.mix(data.cursorSize, glm.length(input.movement) + 3.0, 0.3)
    data.fakeLine[0] = input.mousePos.clone()
    data.fakeLine[1] = input.mousePos.clone()

    let moveDis = 8.0
    let moveId = -1

    let ci = -1
    let minDis = 1e9
    for (let [i, p] of data.points.entries()) {
        if (i > 0) {
            let p0 = data.points[i - 1].clone()
            let p1 = data.points[i].clone()
            let dis2Line = glm.length(glm.cross(p1["-"](p0), input.mousePos["-"](p0))) / 2.0 / glm.distance(p0, p1)

            if (dis2Line < minDis && glm.dot(input.mousePos["-"](p0), input.mousePos["-"](p1)) < 0.0) {
                minDis = dis2Line
                ci = i
                data.fakeLine[0] = p0
                data.fakeLine[1] = p1
            }
        }

        let dis = glm.distance(p, input.mousePos)

        if (moveDis > dis) {
            moveDis = dis
            moveId = i
        }
    }

    if (input.mouseDown && input.button === 1) {
        data.pushMode = (data.pushMode + 1) % 2
    }

    if (ci < 0 && data.points.length > 0) {
        if (data.pushMode === 0) {
            ci = data.points.length
            data.fakeLine[0] = data.points[ci - 1].clone()
            data.fakeLine[1] = data.points[ci - 1].clone()
        } else {
            ci = 0
            data.fakeLine[0] = data.points[0].clone()
            data.fakeLine[1] = data.points[0].clone()
        }
    }

    data.hover = moveId

    if (input.mouseDown && input.button === 0 && data.hover >= 0) {
        data.moveId = moveId
        if (moveId >= 0) {
            data.dragOffset = data.points[moveId]["-"](input.mousePos)
        }
    }

    if (input.mouseDown && input.button === 0 && data.moveId < 0) {
        if (data.points.length < 2) {
            data.points.push(glm.vec2(input.mousePos))
        } else if (ci >= 0) {
            data.points.splice(ci, 0, glm.vec2(input.mousePos))
        }
    }

    if (input.mouseHold && input.button === 0 && data.moveId >= 0) {
        if (data.moveId >= 0) {
            data.points[data.moveId] = input.mousePos["+"](data.dragOffset)
        }
    }

    if (input.mouseUp && input.button === 0 && data.moveId >= 0) {
        data.moveId = -1
    }

    if (input.mouseDown && input.button == 2 && data.hover >= 0) {
        data.moveId = -1
        data.points.splice(data.hover, 1)
    }

    data.length = 0.0
    for (let [i, p] of data.points.entries()) {
        if (i > 0) {
            data.length += glm.distance(data.points[i - 1], p)
        }
    }

    window.line_length = data.points.length
}

/**
 * 
 * @param {HTMLCanvasElement} canvas 
 * @param {CanvasRenderingContext2D} ctx
 * @param {Input} input 
 * @param {Data} data 
 */
function draw(canvas, ctx, input, data) {
    ctx.fillStyle = "#A99683"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = "#FF00FF"

    ctx.strokeStyle = "#124282"

    ctx.beginPath()
    for (let p of data.points) {
        ctx.lineTo(p.x, p.y)
    }
    ctx.stroke()

    ctx.strokeStyle = "#000"

    while (data.tmpArr.length < data.points.length) {
        data.tmpArr.push(glm.vec2(0.0, 0.0))
    }

    if (data.curveType == "polyline") {
        ctx.beginPath()
        for (let p of data.points) {
            ctx.lineTo(p.x, p.y)
        }
        ctx.stroke()
    } else if (data.curveType == "bezier") {
        let step = 10.0 / data.length
        ctx.beginPath()
        for (let pos = 0.0; pos < 1.0 + step; pos += step) {
            let t = glm.clamp(pos, 0.0, 1.0)
            let dp = glm.vec2(0.0, 0.0)
            let wx = 1.0
            for (let [i, p] of data.points.entries()) {
                let weight = wx * Math.pow(t, i) * Math.pow(1.0 - t, data.points.length - i - 1)
                dp["+="](p["*"](weight))
                wx *= (data.points.length - i - 1) / (i + 1)
            }
            ctx.lineTo(dp.x, dp.y)
        }
        ctx.stroke()
    } else if (data.curveType == "b-spline") {
        T = (i) => {
            return glm.clamp(i * 1.0 / (data.points.length), 0.0, 1.0)
        }

        SF_DIV = (a, b) => {
            return (a + 1e-7) / (b + 1e-7)
        }

        N = (i, p, x) => {
            if (p <= 0) {
                return T(i) <= x && T(i + 1) > x ? 1.0 : 0.0
            } else {
                return SF_DIV(x - T(i), T(i + p) - T(i)) * N(i, p - 1, x) + SF_DIV(T(i + p + 1) - x, T(i + p + 1) - T(i + 1)) * N(i + 1, p - 1, x)
            }
        }

        let step = 10.0 / data.length
        ctx.beginPath()
        for (let pos = 0.0; pos < 1.0 + step; pos += step) {
            let t = glm.clamp(pos, 0.0, 1.0 - 1e-7)
            let dp = glm.vec2(0.0, 0.0)
            let ci = Math.floor(t * (data.points.length - 1))
            for (let i = ci - data.order; i < ci + data.order + 1; ++i) {
                let safei = glm.clamp(i, 0, data.points.length - 1)
                dp["+="](data.points[safei]["*"](N(i, data.order, t)))
            }
            ctx.lineTo(dp.x, dp.y)
        }
        ctx.stroke()
    }

    for (let [i, p] of data.points.entries()) {
        ctx.strokeStyle = "#665555"
        ctx.beginPath()
        ctx.arc(p.x, p.y, 3.0, 0.0, Math.PI * 2.0)
        ctx.closePath()
        ctx.stroke()

        if (i === data.hover) {
            ctx.strokeStyle = "#CA3455"
            ctx.beginPath()
            ctx.arc(p.x, p.y, 5.0, 0.0, Math.PI * 2.0)
            ctx.closePath()
            ctx.stroke()
        }
    }

    ctx.strokeStyle = "#678845"
    ctx.globalAlpha = 0.5

    ctx.beginPath()
    ctx.lineTo(data.fakeLine[0].x, data.fakeLine[0].y)
    ctx.lineTo(input.mousePos.x, input.mousePos.y)
    ctx.lineTo(data.fakeLine[1].x, data.fakeLine[1].y)
    ctx.stroke()

    ctx.globalAlpha = 1.0
    ctx.beginPath()
    ctx.arc(input.mousePos.x, input.mousePos.y, data.cursorSize, 0, Math.PI * 2.0)
    ctx.closePath()
    ctx.stroke()

    requestAnimationFrame(() => {
        draw(canvas, ctx, input, data)
    })
}

/**
 * 
 * @param {Data} data 
 */
function saveData(data) {
    localStorage.setItem("points_cache", JSON.stringify(data.points))
    localStorage.setItem("curve_type", data.curveType)
    localStorage.setItem("order", data.order)
    localStorage.setItem("orderId", data.orderId)
}

/**
 * 
 * @param {HTMLCanvasElement} canvas 
 * @param {string} typeSel 
 */
function register(canvas, typeSel, orderId) {
    let ctx = canvas.getContext("2d")
    let input = new Input()
    let data = new Data()
    data.orderId = orderId

    canvas.addEventListener("mousemove", (ev) => {
        ev.preventDefault()
        input.mousePos.x = ev.offsetX
        input.mousePos.y = ev.offsetY
        input.movement = glm.vec2(ev.movementX, ev.movementY)
    })

    canvas.addEventListener("mousedown", (ev) => {
        ev.preventDefault()
        input.mouseDownPos = input.mousePos.clone()
        input.button = ev.button
        input.mouseDown = true
        input.mouseHold = true
        saveData(data)
    })
    canvas.addEventListener("mouseup", (ev) => {
        ev.preventDefault()
        input.mouseUpPos = input.mousePos.clone()
        input.button = ev.button
        input.mouseHold = false
        input.mouseUp = true
        saveData(data)
    })
    canvas.addEventListener("contextmenu", (ev) => {
        ev.preventDefault()
    })
    canvas.addEventListener("wheel", (ev) => {
        data.pushMode = (data.pushMode + 2 + (ev.deltaY > 0 ? 1 : -1)) % 2
        saveData(data)
    })

    setInterval(() => {
        data.curveType = document.querySelector(typeSel).value
        data.order = parseInt(document.getElementById(orderId).value)

        update(input, data)

        input.mouseDown = false
        input.mouseUp = false
    }, 1000.0 / 50.0)

    setInterval(() => {
        saveData(data)
    }, 1000.0 / 5.0)

    draw(canvas, ctx, input, data)
}
