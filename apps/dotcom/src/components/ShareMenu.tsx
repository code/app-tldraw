import * as Popover from '@radix-ui/react-popover'
import React, { useEffect, useState } from 'react'
import {
	ReadonlyStatusToPath,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	lns,
	unwrapLabel,
	useActions,
	useContainer,
	useTranslation,
} from 'tldraw'
import { useShareMenuIsOpen } from '../hooks/useShareMenuOpen'
import { createQRCodeImageDataString } from '../utils/qrcode'
import { SHARE_PROJECT_ACTION, SHARE_SNAPSHOT_ACTION } from '../utils/sharing'
import { ShareButton } from './ShareButton'

type ShareState = {
	state: 'offline' | 'shared' | 'readonly'
	qrCodeDataUrl: string
	url: string
	readonlyUrl: string | null
	readonlyQrCodeDataUrl: string
}

function isReadonlyUrl(url: string) {
	return (
		url.includes(`/${ReadonlyStatusToPath['readonly']}/`) ||
		url.includes(`/${ReadonlyStatusToPath['readonly-legacy']}/`)
	)
}

function isSharedUrl(url: string) {
	return url.includes('/r/')
}

function getFreshShareState(): ShareState {
	const href = window.location.href
	const isShared = isSharedUrl(href)
	const isReadOnly = isReadonlyUrl(href)

	return {
		state: isShared ? 'shared' : isReadOnly ? 'readonly' : 'offline',
		url: window.location.href,
		readonlyUrl: isReadOnly ? window.location.href : null,
		qrCodeDataUrl: '',
		readonlyQrCodeDataUrl: '',
	}
}

async function getReadonlyUrl() {
	const href = window.location.href
	const isReadOnly = isReadonlyUrl(href)
	if (isReadOnly) return href

	const segs = href.split('/')
	segs[segs.length - 2] = ReadonlyStatusToPath['readonly']

	const [roomId, params] = segs[segs.length - 1].split('?')
	const result = await fetch(`/api/readonly-slug/${roomId}`)
	if (!result.ok) return

	const slug = (await result.json()).slug
	if (!slug) return

	segs[segs.length - 1] = slug
	if (params) segs[segs.length - 1] += '?' + params

	return segs.join('/')
}

/** @public */
export const ShareMenu = React.memo(function ShareMenu() {
	const msg = useTranslation()
	const container = useContainer()

	const { [SHARE_PROJECT_ACTION]: shareProject, [SHARE_SNAPSHOT_ACTION]: shareSnapshot } =
		useActions()

	const [shareState, setShareState] = useState(getFreshShareState)

	const [isUploading, setIsUploading] = useState(false)
	const [isUploadingSnapshot, setIsUploadingSnapshot] = useState(false)
	const [isReadOnlyLink, setIsReadOnlyLink] = useState(shareState.state === 'readonly')
	const currentShareLinkUrl = isReadOnlyLink ? shareState.readonlyUrl : shareState.url
	const currentQrCodeUrl = isReadOnlyLink
		? shareState.readonlyQrCodeDataUrl
		: shareState.qrCodeDataUrl
	const [didCopy, setDidCopy] = useState(false)
	const [didCopySnapshotLink, setDidCopySnapshotLink] = useState(false)

	useEffect(() => {
		if (shareState.state === 'offline') {
			return
		}

		let cancelled = false

		const shareUrl = getShareUrl(window.location.href, false)
		if (!shareState.qrCodeDataUrl && shareState.state === 'shared') {
			// Fetch the QR code data URL
			createQRCodeImageDataString(shareUrl).then((dataUrl) => {
				if (!cancelled) {
					setShareState((s) => ({ ...s, shareUrl, qrCodeDataUrl: dataUrl }))
				}
			})
		}

		getReadonlyUrl().then((readonlyUrl) => {
			if (readonlyUrl && !shareState.readonlyQrCodeDataUrl) {
				// fetch the readonly QR code data URL
				createQRCodeImageDataString(readonlyUrl).then((dataUrl) => {
					if (!cancelled) {
						setShareState((s) => ({ ...s, readonlyUrl, readonlyQrCodeDataUrl: dataUrl }))
					}
				})
			}
		})

		const interval = setInterval(() => {
			const url = window.location.href
			if (shareState.url === url) return
			setShareState(getFreshShareState())
		}, 300)

		return () => {
			clearInterval(interval)
			cancelled = true
		}
	}, [shareState])

	const [isOpen, onOpenChange] = useShareMenuIsOpen()

	return (
		<Popover.Root onOpenChange={onOpenChange} open={isOpen}>
			<Popover.Trigger dir="ltr" asChild>
				<ShareButton title={'share-menu.title'} label={'share-menu.title'} />
			</Popover.Trigger>
			<Popover.Portal container={container}>
				<Popover.Content
					dir="ltr"
					className="tlui-menu tlui-share-zone__popover"
					align="end"
					side="bottom"
					sideOffset={2}
					alignOffset={4}
				>
					<TldrawUiMenuContextProvider type="panel" sourceId="share-menu">
						{shareState.state === 'shared' || shareState.state === 'readonly' ? (
							<>
								<button
									className="tlui-share-zone__qr-code"
									style={{ backgroundImage: `url(${currentQrCodeUrl})` }}
									title={msg(
										isReadOnlyLink ? 'share-menu.copy-readonly-link' : 'share-menu.copy-link'
									)}
									onClick={() => {
										if (!currentShareLinkUrl) return
										setDidCopy(true)
										setTimeout(() => setDidCopy(false), 1000)
										navigator.clipboard.writeText(currentShareLinkUrl)
									}}
								/>
								<TldrawUiMenuGroup id="copy">
									<TldrawUiMenuItem
										id="copy-to-clipboard"
										readonlyOk
										icon={didCopy ? 'clipboard-copied' : 'clipboard-copy'}
										label={
											isReadOnlyLink ? 'share-menu.copy-readonly-link' : 'share-menu.copy-link'
										}
										onSelect={() => {
											if (!currentShareLinkUrl) return
											setDidCopy(true)
											setTimeout(() => setDidCopy(false), 750)
											navigator.clipboard.writeText(currentShareLinkUrl)
										}}
									/>
									{shareState.state === 'shared' && (
										<TldrawUiMenuItem
											id="toggle-read-only"
											label="share-menu.readonly-link"
											icon={isReadOnlyLink ? 'check' : 'checkbox-empty'}
											onSelect={async () => {
												setIsReadOnlyLink(() => !isReadOnlyLink)
											}}
										/>
									)}
									<p className="tlui-menu__group tlui-share-zone__details">
										{msg(
											isReadOnlyLink
												? 'share-menu.copy-readonly-link-note'
												: 'share-menu.copy-link-note'
										)}
									</p>
								</TldrawUiMenuGroup>

								<TldrawUiMenuGroup id="snapshot">
									<TldrawUiMenuItem
										{...shareSnapshot}
										icon={didCopySnapshotLink ? 'clipboard-copied' : 'clipboard-copy'}
										onSelect={async () => {
											setIsUploadingSnapshot(true)
											await shareSnapshot.onSelect('share-menu')
											setIsUploadingSnapshot(false)
											setDidCopySnapshotLink(true)
											setTimeout(() => setDidCopySnapshotLink(false), 1000)
										}}
										spinner={isUploadingSnapshot}
									/>
									<p className="tlui-menu__group tlui-share-zone__details">
										{msg('share-menu.snapshot-link-note')}
									</p>
								</TldrawUiMenuGroup>
							</>
						) : (
							<>
								<TldrawUiMenuGroup id="share">
									<TldrawUiMenuItem
										id="share-project"
										label="share-menu.share-project"
										icon="share-1"
										onSelect={async () => {
											if (isUploading) return
											setIsUploading(true)
											await shareProject.onSelect('menu')
											setIsUploading(false)
										}}
										spinner={isUploading}
									/>
									<p className="tlui-menu__group tlui-share-zone__details">
										{msg(
											shareState.state === 'offline'
												? 'share-menu.offline-note'
												: isReadOnlyLink
													? 'share-menu.copy-readonly-link-note'
													: 'share-menu.copy-link-note'
										)}
									</p>
								</TldrawUiMenuGroup>
								<TldrawUiMenuGroup id="copy-snapshot-link">
									<TldrawUiMenuItem
										id="copy-snapshot-link"
										icon={didCopySnapshotLink ? 'clipboard-copied' : 'clipboard-copy'}
										label={unwrapLabel(shareSnapshot.label)}
										onSelect={async () => {
											setIsUploadingSnapshot(true)
											await shareSnapshot.onSelect('share-menu')
											setIsUploadingSnapshot(false)
											setDidCopySnapshotLink(true)
											setTimeout(() => setDidCopySnapshotLink(false), 1000)
										}}
										spinner={isUploadingSnapshot}
									/>
									<p className="tlui-menu__group tlui-share-zone__details">
										{msg('share-menu.snapshot-link-note')}
									</p>
								</TldrawUiMenuGroup>
							</>
						)}
					</TldrawUiMenuContextProvider>
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	)
})

export function getShareUrl(url: string, readonly: boolean) {
	if (!readonly) {
		return url
	}

	const segs = url.split('/')

	// Change the r for a v
	segs[segs.length - 2] = 'v'

	// A url might be something like https://www.tldraw.com/r/123?pageId=myPageId
	// we want it instead to be https://www.tldraw.com/v/312?pageId=myPageId, ie
	// the scrambled room id but not scrambled query params
	const [roomId, params] = segs[segs.length - 1].split('?')
	segs[segs.length - 1] = lns(roomId)
	if (params) segs[segs.length - 1] += '?' + params

	return segs.join('/')
}
