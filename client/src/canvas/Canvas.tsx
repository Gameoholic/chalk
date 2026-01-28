import React, { useRef, useEffect, useState } from 'react'
import BaseCanvas from './BaseCanvas'
import {
    Camera,
    PathObject,
    RectObject,
    Vec2,
    WorldObject,
} from './CanvasTypes'

function Canvas({ className }: { className: string }) {
    // CAMERA
    const [camera, setCamera] = useState<Camera>({
        position: { x: 0, y: 0 },
        size: { x: 500, y: 500 },
        zoom: 1,
    })
    const { handleMouseDown, handleMouseMove, handleMouseUp, handleWheel } =
        handleCamera(camera, setCamera)

    // DRAWING
    const draw = (ctx: CanvasRenderingContext2D) => {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
        const color = '#000000'
        const alpha = 'FF' // between 00 to FF

        const objects: WorldObject[] = [
            {
                type: 'rect',
                position: { x: 0, y: 0 },
                size: { x: 30, y: 30 },
                color: color + alpha,
                createdAt: new Date(),
                id: '1',
                stroke: 1,
            },
            {
                type: 'path',
                points: [
                    { x: 100, y: 2 },
                    { x: 15, y: 40 },
                ],
                color: color + alpha,
                createdAt: new Date(),
                id: '2',
                stroke: 1,
            },
        ]
        const worldMap: Map<string, WorldObject> = new Map()
        objects.forEach((obj) => worldMap.set(obj.id, obj))
        drawObjects(ctx, worldMap, camera)
    }

    return (
        <div>
            <p>
                Camera position: {camera.position.x}, {camera.position.y}
            </p>
            <p>
                Camera zoom: {camera.zoom}, {camera.zoom}
            </p>
            <BaseCanvas
                className={className}
                draw={draw}
                width={camera.size.x}
                height={camera.size.y}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                onWheel={handleWheel}
                zoom={camera.zoom}
                onContextMenu={(e: React.MouseEvent<HTMLCanvasElement>) =>
                    e.preventDefault()
                }
            />
        </div>
    )
}

function drawObjects(
    ctx: CanvasRenderingContext2D,
    objects: Map<string, WorldObject>,
    camera: Camera
) {
    objects.forEach((object) => drawObject(ctx, object, camera))
}

function drawObject(
    ctx: CanvasRenderingContext2D,
    object: WorldObject,
    camera: Camera
) {
    switch (object.type) {
        case 'rect':
            drawRect(ctx, object, camera)
            break
        case 'path':
            drawPath(ctx, object, camera)
            break
    }
}

function drawRect(
    ctx: CanvasRenderingContext2D,
    object: RectObject,
    camera: Camera
) {
    ctx.fillStyle = object.color
    const localPosition: Vec2 = {
        x: object.position.x - camera.position.x,
        y: object.position.y - camera.position.y,
    }
    // todo: make this handle the zoom too?
    ctx.fillRect(localPosition.x, localPosition.y, object.size.x, object.size.y)
}

function drawPath(
    ctx: CanvasRenderingContext2D,
    object: PathObject,
    camera: Camera
) {
    ctx.beginPath()
    ctx.strokeStyle = object.color
    ctx.lineWidth = 2
    ctx.moveTo(
        object.points[0].x - camera.position.x,
        object.points[0].y - camera.position.y
    )
    ctx.lineTo(
        object.points[1].x - camera.position.x,
        object.points[1].y - camera.position.y
    )
    ctx.stroke()
    ctx.closePath()
}

export function handleCamera(
    camera: Camera,
    setCamera: React.Dispatch<React.SetStateAction<Camera>>
) {
    // Camera dragging
    const isDragging = useRef(false)
    const lastMousePos = useRef<Vec2 | null>(null)

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        console.log(e.button)
        if (e.button !== 0) return // only allow left mouse button
        isDragging.current = true
        lastMousePos.current = { x: e.clientX, y: e.clientY }
    }

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDragging.current || !lastMousePos.current) return

        const dx = (e.clientX - lastMousePos.current.x) / camera.zoom
        const dy = (e.clientY - lastMousePos.current.y) / camera.zoom

        setCamera((prev) => ({
            ...prev,
            position: { x: prev.position.x - dx, y: prev.position.y - dy },
        }))

        lastMousePos.current = { x: e.clientX, y: e.clientY }
    }

    const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (e.button !== 0) return // only allow left mouse button
        isDragging.current = false
        lastMousePos.current = null
    }

    // Camera zoom
    const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
        e.preventDefault()
        const zoomFactor = 1.1
        const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top

        setCamera((prev) => {
            const newZoom =
                e.deltaY < 0 ? prev.zoom * zoomFactor : prev.zoom / zoomFactor
            const clampedZoom = Math.max(0.05, Math.min(100, newZoom))

            const worldX = prev.position.x + mouseX / prev.zoom
            const worldY = prev.position.y + mouseY / prev.zoom

            return {
                ...prev,
                zoom: clampedZoom,
                position: {
                    x: worldX - mouseX / clampedZoom,
                    y: worldY - mouseY / clampedZoom,
                },
            }
        })
    }

    return { handleMouseDown, handleMouseMove, handleMouseUp, handleWheel }
}

export default Canvas
