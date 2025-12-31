import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Check } from 'lucide-react';
import { BusinessContext } from '@/types/scriptGenerator';

interface PricingIndustryStepProps {
  pricing: BusinessContext['vsl_context']['pricing'];
  industry: BusinessContext['vsl_context']['industry_niche'];
  vslSpecs: BusinessContext['vsl_context']['vsl_specifications'];
  onUpdatePricing: (field: keyof BusinessContext['vsl_context']['pricing'], value: any) => void;
  onUpdateIndustry: (field: keyof BusinessContext['vsl_context']['industry_niche'], value: string) => void;
  onUpdateVslSpecs: (minutes: number, range: '30-45' | '45-60' | '60-75' | '75-90') => void;
}

const paymentStructures = [
  { value: 'one-time', label: 'One-time' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Annual' },
  { value: 'payment_plan', label: 'Payment plan' },
];

const competitionLevels = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const marketMaturity = [
  { value: 'emerging', label: 'Emerging' },
  { value: 'growing', label: 'Growing' },
  { value: 'mature', label: 'Mature' },
  { value: 'declining', label: 'Declining' },
];

const lengthRanges = [
  { value: '30-45', label: '30-45 min', desc: 'Short' },
  { value: '45-60', label: '45-60 min', desc: 'Standard' },
  { value: '60-75', label: '60-75 min', desc: 'Detailed' },
  { value: '75-90', label: '75-90 min', desc: 'Long' },
];

const PricingIndustryStep = ({
  pricing,
  industry,
  vslSpecs,
  onUpdatePricing,
  onUpdateIndustry,
  onUpdateVslSpecs,
}: PricingIndustryStepProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-foreground mb-2">Pricing & Industry</h3>
        <p className="text-muted-foreground text-sm">Pricing details and market context.</p>
      </div>

      <div className="space-y-5">
        {/* Pricing Section */}
        <div className="p-4 rounded-xl border border-border bg-secondary/20">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Pricing</h4>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="pricePoint" className="text-sm font-medium text-foreground mb-2 block">
                  Main price point
                </Label>
                <Input
                  id="pricePoint"
                  placeholder="e.g., $2,997"
                  value={pricing.price_point}
                  onChange={(e) => onUpdatePricing('price_point', e.target.value)}
                  className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div>
                <Label htmlFor="lowPrice" className="text-sm font-medium text-foreground mb-2 block">
                  Lowest price
                </Label>
                <Input
                  id="lowPrice"
                  type="number"
                  placeholder="e.g., 997"
                  value={pricing.price_range.low || ''}
                  onChange={(e) => onUpdatePricing('price_range', { ...pricing.price_range, low: Number(e.target.value) })}
                  className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div>
                <Label htmlFor="highPrice" className="text-sm font-medium text-foreground mb-2 block">
                  Highest price
                </Label>
                <Input
                  id="highPrice"
                  type="number"
                  placeholder="e.g., 9997"
                  value={pricing.price_range.high || ''}
                  onChange={(e) => onUpdatePricing('price_range', { ...pricing.price_range, high: Number(e.target.value) })}
                  className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-foreground mb-2 block">Payment structure</Label>
                <div className="flex flex-wrap gap-2">
                  {paymentStructures.map((ps) => (
                    <button
                      key={ps.value}
                      onClick={() => onUpdatePricing('payment_structure', ps.value)}
                      className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                        pricing.payment_structure === ps.value
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border bg-secondary/30 text-foreground/80 hover:border-primary/50'
                      }`}
                    >
                      {ps.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="currency" className="text-sm font-medium text-foreground mb-2 block">
                  Currency
                </Label>
                <Input
                  id="currency"
                  placeholder="USD"
                  value={pricing.currency}
                  onChange={(e) => onUpdatePricing('currency', e.target.value)}
                  className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="valueJustification" className="text-sm font-medium text-foreground mb-2 block">
                Why is it worth the price? (1-2 sentences)
              </Label>
              <Textarea
                id="valueJustification"
                placeholder="e.g., The ROI is 10x in the first 90 days through increased lead conversion..."
                value={pricing.value_justification}
                onChange={(e) => onUpdatePricing('value_justification', e.target.value)}
                className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground min-h-[60px]"
              />
            </div>
          </div>
        </div>

        {/* Industry Section */}
        <div className="p-4 rounded-xl border border-border bg-secondary/20">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Industry & Market</h4>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="primaryIndustry" className="text-sm font-medium text-foreground mb-2 block">
                  Primary industry
                </Label>
                <Input
                  id="primaryIndustry"
                  placeholder="e.g., B2B SaaS, E-commerce, Coaching..."
                  value={industry.primary_industry}
                  onChange={(e) => onUpdateIndustry('primary_industry', e.target.value)}
                  className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div>
                <Label htmlFor="subNiche" className="text-sm font-medium text-foreground mb-2 block">
                  Sub-niche
                </Label>
                <Input
                  id="subNiche"
                  placeholder="e.g., Content marketing for SaaS founders"
                  value={industry.sub_niche}
                  onChange={(e) => onUpdateIndustry('sub_niche', e.target.value)}
                  className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="marketSize" className="text-sm font-medium text-foreground mb-2 block">
                  Market size
                </Label>
                <Input
                  id="marketSize"
                  placeholder="e.g., $10B+"
                  value={industry.market_size}
                  onChange={(e) => onUpdateIndustry('market_size', e.target.value)}
                  className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-foreground mb-2 block">Competition</Label>
                <div className="flex gap-2">
                  {competitionLevels.map((cl) => (
                    <button
                      key={cl.value}
                      onClick={() => onUpdateIndustry('competition_level', cl.value)}
                      className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all flex-1 ${
                        industry.competition_level === cl.value
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border bg-secondary/30 text-foreground/80 hover:border-primary/50'
                      }`}
                    >
                      {cl.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-foreground mb-2 block">Market maturity</Label>
                <div className="flex flex-wrap gap-1">
                  {marketMaturity.map((mm) => (
                    <button
                      key={mm.value}
                      onClick={() => onUpdateIndustry('market_maturity', mm.value)}
                      className={`px-2 py-1 rounded border text-[10px] font-medium transition-all ${
                        industry.market_maturity === mm.value
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border bg-secondary/30 text-foreground/80 hover:border-primary/50'
                      }`}
                    >
                      {mm.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* VSL Specs */}
        <div>
          <Label className="text-sm font-medium text-foreground mb-3 block">Target Script Length</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {lengthRanges.map((lr) => (
              <button
                key={lr.value}
                onClick={() => onUpdateVslSpecs(Number(lr.value.split('-')[0]), lr.value as any)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  vslSpecs.target_length.range === lr.value
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border bg-secondary/30 text-foreground/80 hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-sm block">{lr.label}</span>
                    <span className="text-xs text-muted-foreground">{lr.desc}</span>
                  </div>
                  {vslSpecs.target_length.range === lr.value && <Check className="w-4 h-4 text-primary" />}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingIndustryStep;
