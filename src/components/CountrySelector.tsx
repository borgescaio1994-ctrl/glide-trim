// COMPONENTE DE SELEÇÃO DE PAÍS E BANDEIRAS
import { useState } from 'react';
import { Phone, ChevronDown } from 'lucide-react';

interface Country {
  code: string;
  name: string;
  flag: string;
  prefix: string;
}

const countries: Country[] = [
  { code: 'BR', name: 'Brasil', flag: '🇧🇷', prefix: '+55' },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸', prefix: '+1' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', prefix: '+54' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', prefix: '+56' },
  { code: 'CO', name: 'Colômbia', flag: '🇨🇴', prefix: '+57' },
  { code: 'MX', name: 'México', flag: '🇲🇽', prefix: '+52' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪', prefix: '+51' },
  { code: 'UY', name: 'Uruguai', flag: '🇺🇾', prefix: '+598' },
];

export default function CountrySelector() {
  const [selectedCountry, setSelectedCountry] = useState<Country>(countries[0]); // Brasil como padrão
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <Phone className="w-4 h-4 text-muted-foreground" />
        <select
          value={selectedCountry.code}
          onChange={(e) => {
            const country = countries.find(c => c.code === e.target.value);
            if (country) setSelectedCountry(country);
          }}
          className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-background text-foreground"
        >
          {countries.map((country) => (
            <option key={country.code} value={country.code}>
              {country.flag} {country.name}
            </option>
          ))}
        </select>
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </div>
      
      <div className="text-sm text-muted-foreground">
        Prefixo: <span className="font-semibold">{selectedCountry.prefix}</span>
      </div>
    </div>
  );
}
