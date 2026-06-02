import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from '../components/icons.jsx';
import { Placeholder, Button, Tag, Card, Modal, Drawer, SmartImg, Portrait, useToast, Topbar, SectionHeader, Stat, TabRow, OptimizeMenu, AddToTripDrawer } from '../components/ui.jsx';
import { EmptyState, EmptyInline } from './EmptyStates.jsx';
import { Async, CardSkeleton, CatalogCarousel, Carousel, Skeleton, ErrorState, CarouselSkeleton } from '../core/states.jsx';
import { useAccount, useTrips, useCatalog, deriveTraits, profileCompletion } from '../core/store.jsx';
import { TBD, has, orTBD, fmtDuration, fmtMoney } from '../core/contracts.jsx';
// Explore — editorial routes (suggested) + experts. Production: everything via
// tripApi (empty-first). Suggested roteiros render in a horizontal carousel.

const ExploreScreen = ({ setRoute, openExpertProfile }) => {
  const cats = ['Todos','Disney','Europa','Família','Premium','Econômico','Gastronomia','Lua de mel','Aventura','Japão','Praia'];
  const [cat, setCat] = useState('Todos');
  const [open, setOpen] = useState(null);
  const tpl = useCatalog('templates');
  const exp = useCatalog('experts');

  const all = tpl.data || [];
  const list = all.filter(r => cat === 'Todos' || r.category === cat || (r.title || '').toLowerCase().includes(cat.toLowerCase()));
  const listQuery = { ...tpl, data: list, status: tpl.status === 'success' && list.length === 0 ? 'empty' : tpl.status };

  return (
    <div className="min-h-screen">
      <Topbar subtitle="Gaid · Explorar" title="Roteiros editoriais"
        right={<>
          <Button variant="ghost" icon={Icon.Filter}>Filtros</Button>
          <Button variant="secondary" icon={Icon.Sparkles}>Pedir um sob medida</Button>
        </>}/>

      {/* feature hero — brand editorial (no fabricated counts/destinations) */}
      <div className="px-10 mb-8">
        <Card className="grid grid-cols-[1.2fr_1fr] overflow-hidden">
          <div className="p-8 flex flex-col justify-between">
            <div>
              <Tag tone="brand" className="whitespace-nowrap"><Icon.Sparkles size={11}/> em destaque</Tag>
              <h2 className="text-[30px] tracking-tight font-medium text-ink-900 mt-4 leading-tight">
                Viagens <span className="serif-i">autorais,</span> sem multidão.
              </h2>
              <p className="text-[14px] text-ink-600 mt-3 leading-relaxed max-w-[480px]">
                Roteiros assinados pelos nossos experts — hotéis boutique, jantares reservados, transporte fácil.
                Conte pra Gaid o que você procura e ela monta o seu.
              </p>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <Button icon={Icon.Sparkles} onClick={() => setRoute('home')}>Conversar com a Gaid</Button>
              <Button variant="ghost">Salvar</Button>
            </div>
          </div>
          <SmartImg seed="explore-hero" tone="warm" label="Gaid · editorial" w={800} h={600} className="min-h-[280px]"/>
        </Card>
      </div>

      {/* Explore by expert — circular avatars row */}
      <div className="px-10 mb-10">
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="label whitespace-nowrap">Quem assina seus roteiros</div>
            <div className="text-[20px] tracking-tight font-medium text-ink-900 mt-1.5">Explorar por experts</div>
          </div>
          <Button variant="ghost" iconRight={Icon.ArrowRight} onClick={() => setRoute('experts')}>Ver todos</Button>
        </div>
        {exp.status === 'loading' ? (
          <div className="flex items-start gap-6">{[0,1,2,3,4].map(i => <div key={i} className="w-[110px] flex flex-col items-center gap-3"><Skeleton className="h-[88px] w-[88px] rounded-full"/><Skeleton className="h-3 w-16"/></div>)}</div>
        ) : exp.status === 'success' ? (
          <div className="flex items-start gap-6 overflow-x-auto pb-2 -mx-10 px-10 no-scrollbar">
            {exp.data.map(e => (
              <button key={e.id} onClick={() => { setRoute('experts'); openExpertProfile && openExpertProfile(e.id); }}
                className="flex flex-col items-center gap-3 shrink-0 group w-[110px]">
                <div className="relative">
                  <Portrait id={e.portrait} alt={e.name} className="h-[88px] w-[88px] rounded-full ring-1 ring-ink-200 group-hover:ring-2 group-hover:ring-ink-900 transition-all"/>
                  {has(e.rating) && <div className="absolute -bottom-1 -right-1 bg-paper border-half rounded-full h-6 px-1.5 flex items-center gap-1 text-[10.5px] font-medium text-ink-900 shadow-soft"><Icon.Star size={9}/> {e.rating}</div>}
                </div>
                <div className="text-center w-full">
                  <div className="text-[12.5px] font-medium text-ink-900 leading-tight truncate">{(e.name||'').split(' ')[0]}</div>
                  <div className="text-[10.5px] text-ink-500 mt-0.5 truncate">{(e.region||'').split(' & ')[0]}</div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <EmptyInline icon={Icon.Users} title="Experts em breve" desc="Os especialistas que assinam roteiros aparecem aqui quando o catálogo carregar."/>
        )}
      </div>

      {/* filters */}
      <div className="px-10">
        <div className="flex items-center gap-2 flex-wrap mb-6">
          {cats.map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={`h-8 px-3 rounded-full text-[12.5px] border transition-colors ${cat === c ? 'bg-ink-900 text-paper border-ink-900' : 'bg-white text-ink-700 hairline hover:border-ink-400'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Suggested routes — carousel */}
      <div className="px-10 pb-12">
        <CatalogCarousel
          query={listQuery}
          itemClass="w-[320px]"
          empty={<EmptyState icon={Icon.Compass} eyebrow="Roteiros"
            title="Os roteiros sugeridos aparecem aqui"
            desc="A Gaid cura roteiros editoriais assinados por experts. Conte o que você procura e eles surgem aqui em carrossel."
            primary={<Button icon={Icon.Sparkles} onClick={() => setRoute('home')}>Conversar com a Gaid</Button>}/>}
          render={(r) => (
            <button key={r.id} onClick={() => setOpen(r)}
              className="bg-white border-half rounded-2xl overflow-hidden text-left card-h flex flex-col h-[400px] w-full">
              <SmartImg seed={`route-${r.id}`} tone={r.tone} label={r.category} w={600} h={400} className="h-[200px] w-full shrink-0"/>
              <div className="p-5 flex flex-col flex-1 min-h-0">
                <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-wider text-ink-500">
                  <span>{orTBD(r.category)}</span><span className="text-ink-300">·</span><span>{has(r.days) ? `${r.days} dias` : TBD}</span>
                </div>
                <div className="text-[16px] font-medium tracking-tight text-ink-900 mt-2 leading-snug line-clamp-2">{orTBD(r.title)}</div>
                {has(r.expert) && <div className="text-[12.5px] text-ink-500 mt-2 flex items-center gap-1.5"><Icon.Sparkles size={11} className="text-ink-900"/> Por {r.expert}</div>}
                <div className="mt-auto pt-4 flex items-center justify-between gap-2">
                  <div className="text-[12.5px] text-ink-700 whitespace-nowrap">desde <span className="font-medium text-ink-900">{orTBD(r.from)}</span></div>
                  <span className="text-[12.5px] text-ink-900 font-medium inline-flex items-center gap-1 whitespace-nowrap">Ver roteiro <Icon.ArrowRight size={12}/></span>
                </div>
              </div>
            </button>
          )}
        />
      </div>

      <Modal open={!!open} onClose={() => setOpen(null)} size="lg" title={open?.title || ''}
        footer={open && <>
          <Button variant="ghost" onClick={() => setOpen(null)}>Fechar</Button>
          <Button variant="secondary" icon={Icon.Heart}>Salvar</Button>
          <Button icon={Icon.Sparkles} onClick={() => { setRoute('plan'); setOpen(null); }}>Usar como base</Button>
        </>}>
        {open && (
          <div className="space-y-5">
            <SmartImg seed={`route-cover-${open.id}`} tone={open.tone} label={open.category} w={1000} h={500} className="h-[220px] rounded-xl"/>
            <div className="grid grid-cols-4 gap-3">
              <Mini2 label="Dias"     value={orTBD(open.days)}/>
              <Mini2 label="A partir" value={orTBD(open.from)}/>
              <Mini2 label="Expert"   value={has(open.expert) ? open.expert.split(' ')[0] : TBD}/>
              <Mini2 label="Categoria" value={orTBD(open.category)}/>
            </div>
            <div className="bg-ink-50 border-half rounded-xl p-4 flex gap-3">
              <Icon.Sparkles size={16} className="text-ink-900 mt-0.5"/>
              <div className="text-[13px] text-ink-700">A Gaid adapta este roteiro às suas datas, orçamento e ritmo. Pode mudar tudo. É <span className="font-medium text-ink-900">seu</span> depois disso.</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const Mini2 = ({ label, value }) => (
  <div className="bg-ink-50 rounded-xl p-3">
    <div className="label">{label}</div>
    <div className="text-[15px] font-medium text-ink-900 mt-0.5 truncate">{value}</div>
  </div>
);


export { ExploreScreen };
