import { useEffect, useState } from 'react'
import { edge } from '../lib/edge'
import { isMac } from '../lib/platform'
import { useTranslation } from '../i18n'
import type { PlatformInfo } from '../../shared/platform'

/** Capture/copy/drag remain usable when Accessibility is denied. */
export function MacPermissions({ horizontal = false }: { horizontal?: boolean }) {
  const { resolvedLang } = useTranslation()
  const zh = resolvedLang.startsWith('zh')
  const [info, setInfo] = useState<PlatformInfo | null>(null)
  useEffect(() => {
    if (!isMac) return
    let active = true
    const refresh = () => { void edge.getPlatformInfo().then((value) => { if (active) setInfo(value) }) }
    refresh()
    window.addEventListener('focus', refresh)
    const timer = window.setInterval(refresh, 3000)
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [])
  if (!isMac) return null
  return (
    <div className={horizontal ? 'settings-shelf-card behaviour-col' : 'setting-card'}>
      <div className="shelf-card-top">
        <div className="setting-title">{zh ? 'macOS 辅助功能' : 'macOS Accessibility'}</div>
        <div className="setting-desc">
          {info?.accessibilityTrusted
            ? (zh ? '已授权：支持点击粘贴和全屏保护。' : 'Enabled: click-to-paste and fullscreen protection are available.')
            : (zh ? '允许 Edge-Drop 控制辅助功能后，即可将内容粘贴到当前应用。未授权时仍可收集、复制和拖出，再按 ⌘V 粘贴。' : 'Allow Edge-Drop in Accessibility to paste into your app. Capture, copy and drag still work without it; paste manually with ⌘V.')}
        </div>
        {info && !info.nativeAvailable && <div className="setting-desc" role="alert">
          {zh ? '原生组件缺失，请重新安装完整的 Mac 版本。' : 'Native component is missing. Reinstall the complete Mac build.'}
        </div>}
      </div>
      <div className="shelf-card-bottom">
        <button type="button" className="manual-check-btn" onClick={() => void edge.openAccessibilitySettings()}>
          {zh ? '打开系统设置' : 'Open System Settings'}
        </button>
        {info && !info.automaticUpdatesAvailable && <button type="button" className="manual-check-btn" onClick={() => window.open('https://github.com/weiaodi/edgedrop/releases', '_blank')}>
          {zh ? '下载更新' : 'Download updates'}
        </button>}
        {info && !info.automaticUpdatesAvailable && <div className="setting-desc">
          {zh ? '此构建使用手动更新：从此项目的 GitHub Releases 下载新版本。' : 'This build uses manual updates. Download new versions from this project’s GitHub Releases.'}
        </div>}
      </div>
    </div>
  )
}
