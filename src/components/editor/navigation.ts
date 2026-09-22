export const COMMAND_TABS = [
  { id: 'file', label: 'File' },
  { id: 'draw', label: 'Tools' },
  { id: 'walls', label: 'Walls' },
  { id: 'annotate', label: 'Annotate' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'view', label: 'View' },
  { id: 'inventory', label: 'Inventory' },
] as const;

export type CommandTab = typeof COMMAND_TABS[number]['id'];
