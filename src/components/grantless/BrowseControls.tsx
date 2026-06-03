import type { TaskSort } from '@/lib/grantless';
import type { TaskStatus } from '@/lib/catallax';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STATUSES: TaskStatus[] = ['proposed', 'funded', 'in_progress', 'submitted', 'concluded'];
const SORTS: { value: TaskSort; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'funding', label: 'Funding progress' },
  { value: 'amount', label: 'Largest goal' },
];

export interface BrowseControlsState {
  statuses: TaskStatus[];
  sort: TaskSort;
  seekingFunding: boolean;
  needsWorker: boolean;
  hideEmpty: boolean;
}

interface BrowseControlsProps extends BrowseControlsState {
  onChange: (patch: Partial<BrowseControlsState>) => void;
}

/** The browse filter/sort bar: status chips, semantic toggles, and a sort select. */
export function BrowseControls(props: BrowseControlsProps) {
  const { statuses, sort, seekingFunding, needsWorker, hideEmpty, onChange } = props;

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup
          type="multiple"
          variant="outline"
          size="sm"
          value={statuses}
          onValueChange={(v) => onChange({ statuses: v as TaskStatus[] })}
          aria-label="Filter by status"
        >
          {STATUSES.map((s) => (
            <ToggleGroupItem key={s} value={s} className="text-xs">
              {s.replace('_', ' ')}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <div className="ml-auto flex items-center gap-2">
          <Label htmlFor="browse-sort" className="text-xs text-muted-foreground">Sort</Label>
          <Select value={sort} onValueChange={(v) => onChange({ sort: v as TaskSort })}>
            <SelectTrigger id="browse-sort" className="h-8 w-[10.5rem] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2">
          <Switch id="f-seeking" checked={seekingFunding} onCheckedChange={(v) => onChange({ seekingFunding: v })} />
          <Label htmlFor="f-seeking" className="text-xs">Seeking funding</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="f-needs-worker" checked={needsWorker} onCheckedChange={(v) => onChange({ needsWorker: v })} />
          <Label htmlFor="f-needs-worker" className="text-xs">Needs a worker</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="f-hide-empty" checked={hideEmpty} onCheckedChange={(v) => onChange({ hideEmpty: v })} />
          <Label htmlFor="f-hide-empty" className="text-xs">Hide empty applicants</Label>
        </div>
      </div>
    </div>
  );
}
