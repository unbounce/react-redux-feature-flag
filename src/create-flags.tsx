import React, { useContext } from "react";
import shallowEqual from "shallowequal";
import { deepComputed, Computable } from "deep-computed";
import { KeyPath, KeyPathValue } from "useful-types";

export type ProviderProps<T> = {
  flags: Computable<T>;
};

type RenderConsumer<T> = {
  name: KeyPath<T>;
  render(flags: T): React.ReactNode;
  fallbackRender?(flags: T): React.ReactNode;
};

type ChildConsumer<T> = {
  name: KeyPath<T>;
  children: any;
  fallbackRender?(flags: T): React.ReactNode;
};

type ComponentConsumer<T> = {
  name: KeyPath<T>;
  component: React.ComponentType<{ flags: T }>;
  fallbackComponent?: React.ComponentType<{ flags: T }>;
};

export type ConsumerProps<T> =
  | RenderConsumer<T>
  | ChildConsumer<T>
  | ComponentConsumer<T>;

export type CreateFlags<T> = {
  FlagsProvider: React.ComponentType<ProviderProps<T>>;
  Flag: React.ComponentType<ConsumerProps<T>>;
  useFlag<KP extends KeyPath<T>>(keyPath: KP): KeyPathValue<T, KP>;
  useFlags(): T;
};

export function createFlags<T>(): CreateFlags<T> {
  const Context = React.createContext<T | null>(null) as React.Context<T>;
  Context.displayName = "Flag";

  class FlagsProvider extends React.Component<ProviderProps<T>> {
    shouldComponentUpdate(prevProps: ProviderProps<T>) {
      return !shallowEqual(this.props.flags, prevProps.flags);
    }

    render() {
      const value = deepComputed(this.props.flags);
      return (
        <Context.Provider value={value}>{this.props.children}</Context.Provider>
      );
    }
  }

  const useFlags = () => useContext(Context);

  const useFlag = <KP extends KeyPath<T>>(keyPath: KP): KeyPathValue<T, KP> => {
    const flags = useFlags();
    let result: any = flags;

    for (let next of keyPath as string[]) {
      result = result[next];
    }

    return result;
  };

  function Flag(props: ConsumerProps<T>) {
    const flags = useContext(Context);
    const flag = useFlag(props.name);
    const isEnabled = Boolean(flag);

    if (isEnabled && "children" in props) {
      return props.children;
    }

    if (isEnabled && "render" in props) {
      return props.render(flags);
    }

    if (isEnabled && "component" in props) {
      const Component = props.component;
      return <Component flags={flags} />;
    }

    if (!isEnabled && "fallbackRender" in props && props.fallbackRender) {
      return props.fallbackRender(flags);
    }

    if (!isEnabled && "fallbackComponent" in props && props.fallbackComponent) {
      const Component = props.fallbackComponent;
      return <Component flags={flags} />;
    }

    return null;
  }

  return {
    FlagsProvider,
    Flag,
    useFlag,
    useFlags
  };
}

export default createFlags;
