import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Check } from 'lucide-react';
import { BusinessContext } from '@/types/scriptGenerator';

interface ProductServiceStepProps {
  data: BusinessContext['vsl_context']['product_service'];
  onUpdate: (field: keyof BusinessContext['vsl_context']['product_service'], value: string) => void;
}

const offerTypes = [
  { value: 'coaching', label: 'Coaching', desc: '1:1 or group coaching programs' },
  { value: 'course', label: 'Course', desc: 'Online courses or training' },
  { value: 'software', label: 'Software', desc: 'SaaS or digital tools' },
  { value: 'service', label: 'Service', desc: 'Done-for-you services' },
  { value: 'product', label: 'Product', desc: 'Physical or digital products' },
];

const ProductServiceStep = ({ data, onUpdate }: ProductServiceStepProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-foreground mb-2">Your Offer</h3>
        <p className="text-muted-foreground text-sm">Tell us about what you're selling.</p>
      </div>

      <div className="space-y-5">
        <div>
          <Label htmlFor="offerName" className="text-sm font-medium text-foreground mb-2 block">
            What's your offer name?
          </Label>
          <Input
            id="offerName"
            placeholder="e.g., The Founder Accelerator, ContentPro Suite..."
            value={data.name}
            onChange={(e) => onUpdate('name', e.target.value)}
            className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div>
          <Label className="text-sm font-medium text-foreground mb-3 block">
            What type of offer is it?
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {offerTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => onUpdate('type', type.value)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  data.type === type.value
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border bg-secondary/30 text-foreground/80 hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-sm block">{type.label}</span>
                    <span className="text-xs text-muted-foreground">{type.desc}</span>
                  </div>
                  {data.type === type.value && <Check className="w-4 h-4 text-primary" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="description" className="text-sm font-medium text-foreground mb-2 block">
            In 1-2 sentences, what does your offer do for the customer?
          </Label>
          <Textarea
            id="description"
            placeholder="e.g., I help SaaS founders scale from $10k to $100k MRR through systematic content marketing..."
            value={data.description}
            onChange={(e) => onUpdate('description', e.target.value)}
            className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground min-h-[100px]"
          />
        </div>
      </div>
    </div>
  );
};

export default ProductServiceStep;
