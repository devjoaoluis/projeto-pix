import * as Dropdown from '@radix-ui/react-dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { Button } from './button';
export function ActionMenu({
  items,
}: {
  items: { label: string; action: () => void; danger?: boolean }[];
}) {
  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>
        <Button variant="ghost" size="icon" aria-label="Abrir ações">
          <MoreHorizontal size={20} />
        </Button>
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content className="dropdown" align="end" sideOffset={5}>
          {items.map((item) => (
            <Dropdown.Item
              key={item.label}
              className={item.danger ? 'danger' : ''}
              onSelect={item.action}
            >
              {item.label}
            </Dropdown.Item>
          ))}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}
