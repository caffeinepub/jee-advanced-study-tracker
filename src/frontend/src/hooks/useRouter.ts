import {
  Link as TanstackLink,
  useRouterState,
  useNavigate as useTanstackNavigate,
} from "@tanstack/react-router";

export { TanstackLink as Link };

export function useLocation(): string {
  const state = useRouterState();
  return state.location.pathname;
}

export function useNavigate() {
  return useTanstackNavigate();
}
