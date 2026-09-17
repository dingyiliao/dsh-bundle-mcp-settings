declare module '@deepseek-ai/schemastery' {
  export interface Chain {
    default(value: unknown): Chain
    min(value: number): Chain
    step(value: number): Chain
    role(value: string): Chain
  }
  export interface Schemastery {
    object(value: Record<string, unknown>): Chain
    boolean(): Chain
    number(): Chain
    string(): Chain
    array(value: unknown): Chain
    dict(value: unknown): Chain
    union(value: unknown[]): Chain
    const(value: unknown): Chain
  }
  const z: Schemastery
  export default z
}

declare module '@deepseek-ai/dsh-mcp-client' {
  export const apply: unknown
}

declare module '@deepseek-ai/cordis' {
  interface ManagedFiber {
    await(): Promise<unknown>
    dispose(): Promise<void>
  }
  interface Context {
    logger: { error(value: unknown): void }
    plugin(plugin: unknown, config: unknown): ManagedFiber
    effect(callback: () => (() => void | Promise<void>), label?: string): void
    settings: {
      installSection(
        owner: Context,
        namespace: string,
        schema: unknown,
        config: unknown,
        options: {
          validate(value: never): void
          setSource(source: () => never): void
          onChange(): void
        },
      ): void
    }
  }
}
