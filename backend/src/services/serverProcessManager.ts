/**
 * Server Process Manager
 * Phase 7: Automatic Recursive 3-Child Server Scaling
 *
 * Spawns, monitors, and terminates independent child server processes
 * using cross-platform Node.js child_process APIs.
 */

import fs from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { logger } from '../utils/logger';

export interface ManagedServerProcess {
  serverId: string;
  port: number;
  process: ChildProcess;
  startedAt: string;
  exitCode: number | null;
}

export class ServerProcessManager {
  private processes: Map<string, ManagedServerProcess> = new Map();
  private serverScriptPath: string;

  constructor(customScriptPath?: string) {
    this.serverScriptPath =
      customScriptPath ?? path.resolve(__dirname, '../../../servers/src/server.ts');
  }

  /**
   * Spawns an independent HTTP server process for a child node.
   *
   * @param serverId Unique hierarchical server ID (e.g. 'S1.1')
   * @param port Dynamically allocated unique port (e.g. 3101)
   */
  public async spawnServer(serverId: string, port: number): Promise<ManagedServerProcess> {
    if (this.processes.has(serverId)) {
      throw new Error(`[ServerProcessManager] Server process ${serverId} is already running`);
    }

    logger.info(`[ServerProcessManager] Spawning process for ${serverId} on port ${port}...`);

    const compiledPath = path.resolve(__dirname, '../../../servers/dist/server.js');
    const tsPath = this.serverScriptPath;
    const useCompiled = fs.existsSync(compiledPath);

    const execCommand = useCompiled
      ? 'node'
      : (process.platform === 'win32' ? 'npx.cmd' : 'npx');

    const execArgs = useCompiled
      ? [compiledPath, serverId, String(port)]
      : ['tsx', tsPath, serverId, String(port)];

    // Cross-platform spawn prioritizing native compiled node executable
    const child = spawn(execCommand, execArgs, {
      shell: process.platform === 'win32',
      stdio: 'pipe',
      env: {
        ...process.env,
        PORT: String(port),
        SERVER_ID: serverId,
        SERVER_PORT: String(port),
      },
    });

    const managed: ManagedServerProcess = {
      serverId,
      port,
      process: child,
      startedAt: new Date().toISOString(),
      exitCode: null,
    };

    child.stdout?.on('data', (data) => {
      const line = data.toString().trim();
      if (line) {
        logger.debug(`[${serverId}:${port}] ${line}`);
      }
    });

    child.stderr?.on('data', (data) => {
      const line = data.toString().trim();
      if (line && !line.includes('ExperimentalWarning')) {
        logger.warn(`[${serverId}:${port}] STDERR: ${line}`);
      }
    });

    child.on('exit', (code) => {
      managed.exitCode = code;
      logger.info(
        `[ServerProcessManager] Process for ${serverId} on port ${port} exited with code ${code}`
      );
      this.processes.delete(serverId);
    });

    this.processes.set(serverId, managed);
    return managed;
  }

  /**
   * Gracefully terminates an individual managed server process.
   * Sends POST /shutdown first, then falls back to process.kill().
   */
  public async terminateServer(serverId: string): Promise<boolean> {
    const managed = this.processes.get(serverId);
    if (!managed) {
      return false;
    }

    const { port, process: proc } = managed;
    logger.info(`[ServerProcessManager] Terminating server ${serverId} on port ${port}...`);

    // 1. Try graceful HTTP shutdown
    try {
      await fetch(`http://localhost:${port}/shutdown`, {
        method: 'POST',
        signal: AbortSignal.timeout(1000),
      });
    } catch {
      // If HTTP shutdown times out or fails, proceed to process kill
    }

    // 2. Kill child process
    try {
      proc.kill();
    } catch {}

    // 3. Await port release
    const start = Date.now();
    while (Date.now() - start < 3000) {
      try {
        const res = await fetch(`http://localhost:${port}/health`, {
          signal: AbortSignal.timeout(200),
        });
        if (!res.ok) break;
      } catch {
        break; // Successfully down
      }
      await new Promise((r) => setTimeout(r, 100));
    }

    this.processes.delete(serverId);
    logger.info(`[ServerProcessManager] Server ${serverId} terminated and removed`);
    return true;
  }

  /**
   * Gracefully terminates ALL dynamically spawned child processes.
   */
  public async terminateAll(): Promise<void> {
    const serverIds = Array.from(this.processes.keys());
    if (serverIds.length === 0) return;

    logger.info(`[ServerProcessManager] Terminating all ${serverIds.length} dynamic child processes...`);
    await Promise.all(serverIds.map((id) => this.terminateServer(id)));
    this.processes.clear();
  }

  /**
   * Returns list of currently running processes.
   */
  public getRunningServers(): ManagedServerProcess[] {
    return Array.from(this.processes.values());
  }

  /**
   * Returns running server count.
   */
  public getRunningCount(): number {
    return this.processes.size;
  }

  /**
   * Returns a specific managed process.
   */
  public getProcess(serverId: string): ManagedServerProcess | undefined {
    return this.processes.get(serverId);
  }
}

export const serverProcessManager = new ServerProcessManager();
