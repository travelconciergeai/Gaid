// Mobile Hotels (Hotéis) — Gaid Collection editorial in vertical format.
//
// Why this layout vs. desktop:
// • Desktop is a 3-column grid; mobile is a single vertical list with full-bleed
//   imagery and overlay info — feels closer to how people browse hotels
//   in Airbnb/Booking on phone.
// • Saved filter chips (city, category) sit above the list as horizontal scroll.
// • A "Sort/Map" segmented control lets users switch to a map view (mocked).
// • Each hotel card is image-led with a save heart and bottom-overlay info.
// • Tap → opens an immersive detail sheet with photo gallery, perks, room types.

const HotelsMobile = ({ goTo, openChat, embedded = false }) => {
  const toast = useToast();
  const [open, setOpen] = useState(null);
  const [filter, setFilter] = useState('todos');
  const [saved, setSaved] = useState({});
  const [addItem, setAddItem] = useState(null);

  const filters = [
    { id: 'todos',     label: 'Todos' },
    { id: 'Lisboa',    label: 'Lisboa' },
    { id: 'Porto',     label: 'Porto' },
    { id: 'Lamego',    label: 'Vale do Douro' },
    { id: 'Gaid',      label: 'Gaid Collection' },
    { id: 'Boutique',  label: 'Boutique' },
    { id: 'Premium',   label: 'Premium' },
  ];

  const list = mockData.hotels.filter(h => {
    if (filter === 'todos') return true;
    return h.city === filter || h.tag === filter || h.tag?.includes(filter);
  });

  const toggleSave = (id) => {
    setSaved(s => ({ ...s, [id]: !s[id] }));
    toast({ title: saved[id] ? 'Removido dos salvos' : 'Salvo' });
  };

  return (
    <div className="relative pb-[112px]">
      {!embedded && (
        <>
          <header className="px-5 pt-6 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon.Logo size={22} className="text-ink-900"/>
              <span className="text-[15px] font-medium tracking-[-0.01em] text-ink-900">Gaid</span>
            </div>
            <button onClick={() => openChat('Quero ajuda pra escolher um hotel em Portugal')}
              className="h-10 w-10 rounded-full active:bg-ink-100 flex items-center justify-center text-ink-700">
              <Icon.Sparkles size={18}/>
            </button>
          </header>

          <section className="px-5 pt-8 pb-5">
            <div className="label">Gaid Collection</div>
            <h1 className="text-[28px] tracking-[-0.025em] font-medium text-ink-900 leading-[1.06] mt-2">
              Hotéis com <span className="serif-i">história e gosto.</span>
            </h1>
            <p className="text-[13px] text-ink-600 mt-3 leading-relaxed">
              {mockData.hotels.length} propriedades selecionadas. Perks Gaid em cada uma.
            </p>
          </section>
        </>
      )}

      {/* Filters */}
      <section className="pb-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pl-5 pr-5 pb-2">
          {filters.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`shrink-0 h-9 px-3.5 rounded-full text-[12.5px] font-medium transition-colors border whitespace-nowrap
                          ${filter === f.id ? 'bg-ink-900 text-paper border-ink-900' : 'bg-white text-ink-700 border-half active:bg-ink-100'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {/* Sort / Map segmented */}
      <section className="px-5 pb-5 flex items-center justify-between">
        <div className="bg-ink-100 rounded-lg p-0.5 inline-flex">
          <button className="h-7 px-3 rounded-md bg-paper text-ink-900 text-[11.5px] font-medium shadow-soft">Lista</button>
          <button className="h-7 px-3 rounded-md text-ink-600 text-[11.5px] font-medium">Mapa</button>
        </div>
        <button className="text-[12px] text-ink-700 font-medium px-2 py-1 active:bg-ink-100 rounded-md">
          <Icon.Filter size={12} className="inline -mt-0.5 mr-1"/>Filtros
        </button>
      </section>

      {/* List */}
      <section className="px-5 space-y-4">
        {list.length === 0 ? (
          <div className="bg-white border-half rounded-2xl p-8 text-center">
            <div className="text-[14px] text-ink-700">Nenhum hotel nesse filtro.</div>
          </div>
        ) : list.map(h => (
          <HotelCard key={h.id} hotel={h} saved={!!saved[h.id]}
            onSave={() => toggleSave(h.id)} onTap={() => setOpen(h)}/>
        ))}
      </section>

      {/* Hotel detail */}
      <HotelDetailSheet hotel={open} onClose={() => setOpen(null)}
        onBook={() => { const h = open; setOpen(null); setTimeout(() => setAddItem(h), 250); }}
        saved={open ? !!saved[open.id] : false}
        onSave={() => open && toggleSave(open.id)}/>

      <AddToTripSheet open={!!addItem} onClose={() => setAddItem(null)} item={addItem}/>
    </div>
  );
};

// ============ Hotel card ============
const HotelCard = ({ hotel, saved, onSave, onTap }) => (
  <button onClick={onTap}
    className="w-full bg-white border-half rounded-3xl overflow-hidden text-left active:scale-[.99] transition-transform shadow-soft">
    <div className="relative">
      <SmartImg seed={`hotel-${hotel.id}`} tone={hotel.tone} label={hotel.city} w={800} h={500} className="h-[240px] w-full"/>
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 via-black/10 to-transparent"/>

      <div className="absolute top-3 left-3">
        <Tag tone="white">{hotel.tag}</Tag>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onSave(); }}
        className="absolute top-3 right-3 h-9 w-9 rounded-full bg-paper/95 border-half flex items-center justify-center active:scale-90 transition-transform">
        <Icon.Heart size={15} className={saved ? 'fill-ink-900 text-ink-900' : 'text-ink-700'}/>
      </button>

      <div className="absolute left-4 bottom-3 right-4">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-paper text-[18px] font-medium tracking-tight leading-tight">{hotel.name}</div>
            <div className="text-paper/85 text-[11.5px] mt-1 flex items-center gap-1.5">
              <Icon.MapPin size={11}/>{hotel.city}
            </div>
          </div>
          <div className="h-6 px-2 rounded-full bg-paper/95 border-half text-[11px] font-medium text-ink-900 flex items-center gap-1 shrink-0">
            <Icon.Star size={10}/>{hotel.rating}
          </div>
        </div>
      </div>
    </div>

    {/* Body */}
    <div className="p-4">
      <div className="flex items-start gap-2 mb-3">
        <Icon.Sparkles size={12} className="text-ink-900 mt-0.5 shrink-0"/>
        <div className="text-[12px] text-ink-700 leading-snug">
          <span className="font-medium text-ink-900">Gaid perk:</span> {hotel.perk}
        </div>
      </div>
      <div className="pt-3 border-t hairline flex items-center justify-between">
        <div className="text-[11px] text-ink-500">{hotel.nights} noites · total</div>
        <div className="text-[16px] font-medium text-ink-900">{hotel.price}</div>
      </div>
    </div>
  </button>
);

// ============ Hotel detail sheet ============
const HotelDetailSheet = ({ hotel, onClose, onBook, saved, onSave }) => {
  if (!hotel) return null;
  return (
    <BottomSheet open={!!hotel} onClose={onClose} height="92vh"
      footer={
        <>
          <Button variant="ghost" icon={Icon.Heart} onClick={onSave} className={saved ? '!text-ink-900' : ''}/>
          <Button onClick={onBook} icon={Icon.Plus} className="flex-1">Adicionar a uma viagem</Button>
        </>
      }>
      {/* Gallery */}
      <div className="relative">
        <div className="h-[280px] overflow-hidden">
          <SmartImg seed={`hotel-${hotel.id}-cover`} tone={hotel.tone} label={hotel.city} w={800} h={500} className="h-full w-full"/>
        </div>
        <div className="grid grid-cols-3 gap-1 px-1 pt-1">
          {[1,2,3].map(i => (
            <SmartImg key={i} seed={`hotel-${hotel.id}-g${i}`} tone={['warm','cool','sage'][i-1]} w={300} h={200} className="aspect-[4/3] rounded-md"/>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="px-5 pt-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <Tag tone="ink">{hotel.tag}</Tag>
            <div className="text-[22px] font-medium tracking-tight text-ink-900 mt-3 leading-snug">{hotel.name}</div>
            <div className="text-[12.5px] text-ink-500 mt-1 flex items-center gap-1.5">
              <Icon.MapPin size={11}/>{hotel.city}
            </div>
          </div>
          <div className="h-7 px-2.5 rounded-full bg-ink-50 border-half text-[12px] font-medium text-ink-900 flex items-center gap-1 shrink-0">
            <Icon.Star size={11}/>{hotel.rating}
          </div>
        </div>

        <p className="text-[13.5px] text-ink-700 leading-relaxed mt-3">
          Propriedade boutique premiada, selecionada pessoalmente pela expert local.
          Atendimento sob medida e benefícios Gaid aplicados automaticamente.
        </p>
      </div>

      {/* Gaid perk */}
      <div className="px-5 pt-5">
        <div className="bg-ink-900 text-paper rounded-2xl p-4 flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-paper/10 flex items-center justify-center shrink-0">
            <Icon.Sparkles size={15}/>
          </div>
          <div className="flex-1">
            <div className="text-[10.5px] uppercase tracking-wider text-paper/60">Gaid Perk</div>
            <div className="text-[13px] mt-1 leading-snug">{hotel.perk}</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 pt-4 grid grid-cols-2 gap-2">
        <DetailTile label="Noites" value={hotel.nights}/>
        <DetailTile label="Cancelamento" value="Grátis 48h"/>
        <DetailTile label="Check-in" value="15:00"/>
        <DetailTile label="Check-out" value="12:00"/>
      </div>

      {/* Rooms */}
      <div className="px-5 pt-6">
        <div className="label mb-3">Tipos de quarto</div>
        <div className="space-y-2">
          <RoomRow name="Deluxe Vista Rio" beds="1 cama king" price={hotel.price} selected/>
          <RoomRow name="Junior Suite" beds="1 cama king + sofá" price="R$ 5.480"/>
          <RoomRow name="Penthouse Gaid" beds="2 quartos · jacuzzi" price="R$ 8.900"/>
        </div>
      </div>

      {/* Amenities */}
      <div className="px-5 pt-6 pb-6">
        <div className="label mb-3">Comodidades</div>
        <div className="grid grid-cols-2 gap-y-2">
          {['Wi-Fi premium','Café da manhã','Spa premiado','Vista para o rio','Concierge 24h','Estacionamento'].map(a => (
            <div key={a} className="flex items-center gap-2 text-[12.5px] text-ink-700">
              <Icon.Check size={12} className="text-ink-900"/>{a}
            </div>
          ))}
        </div>
      </div>

      {/* Total */}
      <div className="px-5 pb-6">
        <div className="bg-ink-50 border-half rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-[10.5px] uppercase tracking-wider text-ink-500">Total</div>
            <div className="text-[20px] font-medium text-ink-900 mt-0.5">{hotel.price}</div>
            <div className="text-[11px] text-ink-500 mt-0.5">{hotel.nights} noites · impostos inclusos</div>
          </div>
          <Tag tone="ink"><Icon.Sparkles size={10}/> 5× pts</Tag>
        </div>
      </div>
    </BottomSheet>
  );
};

const DetailTile = ({ label, value }) => (
  <div className="bg-ink-50 rounded-xl px-3 py-2.5">
    <div className="label">{label}</div>
    <div className="text-[14px] font-medium text-ink-900 mt-0.5 truncate">{value}</div>
  </div>
);

const RoomRow = ({ name, beds, price, selected }) => (
  <button className={`w-full text-left flex items-center gap-3 px-3.5 py-3 rounded-xl border-half transition-colors
                      ${selected ? 'bg-ink-900 text-paper border-ink-900' : 'bg-white text-ink-900 active:bg-ink-50'}`}>
    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0
                    ${selected ? 'bg-paper/10' : 'bg-ink-100'}`}>
      <Icon.Bed size={14} className={selected ? 'text-paper' : 'text-ink-900'}/>
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-[13.5px] font-medium leading-tight">{name}</div>
      <div className={`text-[11.5px] mt-0.5 ${selected ? 'text-paper/70' : 'text-ink-500'}`}>{beds}</div>
    </div>
    <div className="text-[13px] font-medium mono shrink-0">{price}</div>
  </button>
);

window.HotelsMobile = HotelsMobile;
