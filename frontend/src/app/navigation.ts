import {useCallback, useEffect, useState} from 'react'
import type {Page} from '../types/document'

export const pagePaths: Record<Page, string> = {
    documents: '/documents',
    dashboard: '/dashboard',
    activity: '/activity',
    shared: '/shared',
    recent: '/recent',
    settings: '/settings',
    development: '/development',
    notifications: '/notifications',
    profile: '/profile',
}

function normalizePath(path: string): string {
    return path.replace(/\/+$/, '') || '/'
}

export function useAppNavigation() {
    const [pathname, setPathname] = useState(
        () => window.location.pathname
    )

    const normalizedPath = normalizePath(pathname)

    const matchedPage = (
        Object.entries(pagePaths).find(
            ([, path]) => path === normalizedPath
        )?.[0] as Page | undefined
    )

    const page = matchedPage ?? 'documents'

    useEffect(() => {
        const syncPath = () => {
            setPathname(window.location.pathname)
        }

        window.addEventListener('popstate', syncPath)

        return () => {
            window.removeEventListener('popstate', syncPath)
        }
    }, [])

    useEffect(() => {
        const isValidPath = Object.values(pagePaths).includes(
            normalizedPath as (typeof pagePaths)[keyof typeof pagePaths]
        )

        if (!isValidPath || pathname !== normalizedPath) {
            window.history.replaceState(
                null,
                '',
                pagePaths.documents
            )
            setPathname(pagePaths.documents)
        }
    }, [pathname, normalizedPath])

    const openPage = useCallback((nextPage: Page) => {
        const nextPath = pagePaths[nextPage]

        if (normalizePath(window.location.pathname) !== nextPath) {
            window.history.pushState(null, '', nextPath)
            setPathname(nextPath)
            window.dispatchEvent(new PopStateEvent('popstate'))
        }
    }, [])

    return {page, openPage}
}
