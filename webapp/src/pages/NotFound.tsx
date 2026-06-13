import { Link } from "react-router-dom";
import { Goal } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
          <Goal className="h-8 w-8" />
        </div>
        <h1 className="font-display text-5xl tracking-tight">404</h1>
        <p className="mb-6 mt-2 text-muted-foreground">Nie znaleziono tej strony.</p>
        <Link to="/">
          <Button>Wróć do meczów</Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
