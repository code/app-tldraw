import { defineMigrations } from '@tldraw/store'

import { object, TypeValidator } from '@tldraw/validate'
import { opacityValidator, TLOpacityType } from '../styles/TLOpacityStyle'
import { createShapeValidator, TLBaseShape } from './TLBaseShape'

/** @public */
export type TLGroupShapeProps = {
	opacity: TLOpacityType
}

/** @public */
export type TLGroupShape = TLBaseShape<'group', TLGroupShapeProps>

/** @internal */
export const groupShapeValidator: TypeValidator<TLGroupShape> = createShapeValidator(
	'group',
	object({
		opacity: opacityValidator,
	})
)

/** @internal */
export const groupShapeMigrations = defineMigrations({})