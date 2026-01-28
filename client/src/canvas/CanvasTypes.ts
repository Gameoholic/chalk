export interface Vec2 {
    x: number
    y: number
}

export type ObjectType = 'path' | 'rect' | 'ellipse' | 'text' | 'image'

export interface BaseObject {
    id: string
    type: ObjectType
}

export interface ShapeObject extends BaseObject {
    color: string
    stroke: number
}

export interface PathObject extends ShapeObject {
    type: 'path'
    points: Vec2[] // distance-sampled points
}

export interface RectObject extends ShapeObject {
    type: 'rect'
    position: Vec2
    size: Vec2
}

export type WorldObject = PathObject | RectObject

export interface Camera {
    position: Vec2 // top-left world coordinate
    size: Vec2 // size of the canvas in pixels
    zoom: number // 1 = default, 2 = zoom in, 0.5 = zoom out
}
