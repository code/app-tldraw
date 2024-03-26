import { StateNode, TLNoteShape, Vec, createShapeId } from '@tldraw/editor'

export class Dragging extends StateNode {
	static override id = 'dragging'
	shape = {} as TLNoteShape
	dropZoneShape = undefined as TLNoteShape | undefined

	override onEnter = (shape: TLNoteShape) => {
		this.shape = shape
	}
	override onExit = () => {
		this.cleanupDropZone()
	}

	override onPointerMove = () => {
		this.editor.updateShape({
			...this.shape,
			x: this.editor.inputs.currentPagePoint.x - 100,
			y: this.editor.inputs.currentPagePoint.y - 100,
		})
		this.showDropZone()
	}

	override onPointerUp = () => {
		if (this.dropZoneShape) {
			this.editor.updateShape({
				...this.shape,
				x: this.dropZoneShape.x,
				y: this.dropZoneShape.y,
			})
		}
		this.cleanupDropZone()
		this.editor.setCurrentTool('select')
	}

	cleanupDropZone() {
		if (this.dropZoneShape) {
			this.editor.deleteShape(this.dropZoneShape.id)
			this.dropZoneShape = undefined
		}
	}

	override onCancel = () => {
		this.cleanupDropZone()
		this.editor.setCurrentTool('select')
	}

	private showDropZone() {
		const getSourceNote = ():
			| {
					note: TLNoteShape
					direction: 'above' | 'below' | 'left' | 'right'
			  }
			| undefined => {
			const notes = this.editor
				.getCurrentPageShapes()
				.filter((s) => s.type === 'note')
				.filter((s) => s.id !== this.shape.id)
				.filter((s) => {
					const distance = Vec.Dist(
						{ x: s.x + 100, y: s.y + 100 },
						this.editor.inputs.currentPagePoint
					)
					if (distance < 350) return true
					return false
				})
				.sort((a, b) => {
					const distanceA = Vec.Dist(
						{ x: a.x + 100, y: a.y + 100 },
						this.editor.inputs.currentPagePoint
					)
					const distanceB = Vec.Dist(
						{ x: b.x + 100, y: b.y + 100 },
						this.editor.inputs.currentPagePoint
					)
					return distanceA - distanceB
				}) as TLNoteShape[]

			if (notes.length === 0) return undefined
			let direction: 'above' | 'below' | 'left' | 'right' | null = null
			if (
				notes[0].y - this.editor.inputs.currentPagePoint.y > 0 &&
				notes[0].x - this.editor.inputs.currentPagePoint.x < 0 &&
				notes[0].x + 200 - this.editor.inputs.currentPagePoint.x > 0
			) {
				direction = 'above'
			} else if (
				notes[0].y + 200 - this.editor.inputs.currentPagePoint.y < 0 &&
				notes[0].x - this.editor.inputs.currentPagePoint.x < 0 &&
				notes[0].x + 200 - this.editor.inputs.currentPagePoint.x > 0
			) {
				direction = 'below'
			} else if (
				notes[0].x - this.editor.inputs.currentPagePoint.x > 0 &&
				notes[0].y - this.editor.inputs.currentPagePoint.y < 0 &&
				notes[0].y + 200 - this.editor.inputs.currentPagePoint.y > 0
			) {
				direction = 'left'
			} else if (
				notes[0].x + 200 - this.editor.inputs.currentPagePoint.x < 0 &&
				notes[0].y - this.editor.inputs.currentPagePoint.y < 0 &&
				notes[0].y + 200 - this.editor.inputs.currentPagePoint.y > 0
			) {
				direction = 'right'
			}
			if (!direction) return undefined

			return { direction, note: notes[0] }
		}
		const source = getSourceNote()

		if (!source) {
			this.cleanupDropZone()
			return
		}

		function getPosition(note: TLNoteShape, direction: 'above' | 'below' | 'left' | 'right') {
			switch (direction) {
				case 'above':
					return { x: note.x, y: note.y - 230 }
				case 'below':
					return { x: note.x, y: note.y + 230 }
				case 'left':
					return { x: note.x - 230, y: note.y }
				case 'right':
					return { x: note.x + 230, y: note.y }
			}
		}

		if (!this.dropZoneShape) {
			const position = getPosition(source.note, source.direction)

			// todo: this should check the square around the note, not just the point
			const shapesAtPoint = this.editor.getShapesAtPoint(position)
			if (shapesAtPoint.length > 0) {
				this.cleanupDropZone()
				return
			}

			const id = createShapeId()
			this.editor.createShape({
				type: 'geo',
				id,
				x: position.x,
				y: position.y,
				opacity: 0.25,
				props: { h: 200, w: 200, color: 'light-blue', fill: 'solid', dash: 'dashed' },
			})
			this.dropZoneShape = this.editor.getShape(id)
		}
	}
}