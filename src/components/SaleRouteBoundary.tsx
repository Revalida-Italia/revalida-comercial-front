import { Component, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

type Props = { children: ReactNode };
type State = { failed: boolean };

/** Keeps a broken sale from taking the whole screen down. */
export class SaleRouteBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="space-y-3">
        <p className="text-sm text-foreground">Não foi possível abrir esta venda.</p>
        <Button asChild variant="outline" size="sm">
          <Link to="/dashboard">Voltar para a lista</Link>
        </Button>
      </div>
    );
  }
}
