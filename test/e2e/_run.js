import { spawn } from 'node:child_process'

export const runNodeInline = async (code, cwd) => {
  return await new Promise((resolve) => {
    const child = spawn(process.execPath, ['--input-type=module', '-e', code], { cwd, stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', d => { stdout += d.toString() })
    child.stderr.on('data', d => { stderr += d.toString() })
    child.on('close', (exitCode) => resolve({ code: exitCode, stdout, stderr }))
  })
}
