import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: string | null
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = {
    error: null,
  }

  override componentDidCatch(error: Error, _info: ErrorInfo) {
    this.setState({ error: error.message || '未知错误' })
  }

  override render() {
    if (this.state.error) {
      return (
        <div className="fatal-screen">
          <div className="fatal-screen__card">
            <h1>界面加载失败</h1>
            <p>前端渲染出现异常。你可以先重新启动应用；如果问题持续，再把下面的错误信息发给我。</p>
            <code>{this.state.error}</code>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
