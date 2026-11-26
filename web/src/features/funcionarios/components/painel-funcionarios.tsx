import { useState } from 'react';
import { useCriarFuncionario, useGetFuncionarios, useRemoverFuncionario } from '../hooks/funcionarios-api.hooks';
import { brl, centavos, iniciais } from '../../../shared/utils/format';
import type { Periodicidade } from '../../../api/services/funcionarios';

const CICLO: Record<Periodicidade, string> = {
  mensal: 'por mês',
  quinzenal: 'por quinzena',
  semanal: 'por semana',
  diario: 'por dia',
};

const CARGOS = ['pizzaiolo', 'atendente', 'entregador', 'caixa', 'gerente'] as const;
type Cargo = (typeof CARGOS)[number];

export const PainelFuncionarios: React.FC = () => {
  const { data: funcionarios } = useGetFuncionarios();
  const criar = useCriarFuncionario();
  const remover = useRemoverFuncionario();
  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState<Cargo>(CARGOS[0]);
  const [turno, setTurno] = useState('noite');
  const [salario, setSalario] = useState('');
  const [periodicidade, setPeriodicidade] = useState<Periodicidade>('mensal');
  const [diaPagamento, setDiaPagamento] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [modal, setModal] = useState(false);

  const lista = Array.isArray(funcionarios) ? funcionarios : (funcionarios?.dados ?? []);
  const folha = Array.isArray(funcionarios) ? funcionarios.reduce((s, f) => s + f.salario, 0) : funcionarios?.folha ?? 0;

  const incluir = () => {
    if (!nome.trim() || !salario) return;
    criar.mutate(
      {
        nome: nome.trim(),
        cargo,
        turno,
        salario: centavos(salario),
        periodicidade,
        diaPagamento: diaPagamento ? Number(diaPagamento) : null,
        dataFim: dataFim || null,
      },
      {
        onSuccess: () => {
          setNome('');
          setSalario('');
          setDiaPagamento('');
          setDataFim('');
          setPeriodicidade('mensal');
        },
      },
    );
  };

  return (
    <div className="func">
      <div className="func__topo">
        <div>
          <h2>Equipe</h2>
          <span className="nota">
            {lista.length} pessoa(s) · folha {brl(folha)}
          </span>
        </div>
        <button type="button" className="botao botao--primario botao--mini" onClick={() => setModal(true)}>
          + Adicionar
        </button>
      </div>

      <div className="func__lista">
        {lista.map((pessoa) => (
          <div key={pessoa.id} className="func__linha">
            <span className="func__avatar">{iniciais(pessoa.nome)}</span>
            <div className="func__texto">
              <strong>{pessoa.nome}</strong>
              <span className="nota">
                {pessoa.cargo} · turno {pessoa.turno}
                {pessoa.diaPagamento ? ` · paga dia ${pessoa.diaPagamento}` : ''}
                {pessoa.dataFim ? ` · até ${pessoa.dataFim}` : ''}
              </span>
            </div>
            <span className="func__turno nota">{pessoa.admissao ?? ''}</span>
            <strong className="func__salario">
              {brl(pessoa.salario)}
              <span className="nota"> {CICLO[(pessoa.periodicidade ?? 'mensal') as Periodicidade]}</span>
            </strong>
            <button
              type="button"
              className="func__remover"
              aria-label={`Remover ${pessoa.nome}`}
              onClick={() => remover.mutate(pessoa.id)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {modal && (
        <div className="dlg__fundo" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="dlg">
            <header className="dlg__topo">
              <h2>Novo funcionário</h2>
              <button type="button" className="dlg__x" onClick={() => setModal(false)} aria-label="Fechar">
                ✕
              </button>
            </header>

            <div className="dlg__corpo">
              <label className="dlg__bloco">
                <span className="dlg__rotulo">Nome</span>
                <input className="dlg__campo" placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
              </label>

              <label className="dlg__bloco">
                <span className="dlg__rotulo">Cargo</span>
                <select className="dlg__campo" value={cargo} onChange={(e) => setCargo(e.target.value as Cargo)}>
                  {CARGOS.map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="dlg__bloco">
                <span className="dlg__rotulo">Turno</span>
                <select className="dlg__campo" value={turno} onChange={(e) => setTurno(e.target.value)}>
                  <option value="manha">Manhã</option>
                  <option value="tarde">Tarde</option>
                  <option value="noite">Noite</option>
                </select>
              </label>

              <label className="dlg__bloco">
                <span className="dlg__rotulo">Valor por pagamento</span>
                <input className="dlg__campo" placeholder="0,00" value={salario} onChange={(e) => setSalario(e.target.value)} />
              </label>

              <label className="dlg__bloco">
                <span className="dlg__rotulo">Paga</span>
                <select
                  className="dlg__campo"
                  value={periodicidade}
                  onChange={(e) => setPeriodicidade(e.target.value as Periodicidade)}
                >
                  <option value="mensal">Todo mês</option>
                  <option value="quinzenal">A cada 15 dias</option>
                  <option value="semanal">Toda semana</option>
                  <option value="diario">Todo dia</option>
                </select>
              </label>

              <label className="dlg__bloco">
                <span className="dlg__rotulo">Dia do pagamento (opcional)</span>
                <input
                  className="dlg__campo"
                  inputMode="numeric"
                  placeholder="5"
                  value={diaPagamento}
                  onChange={(e) => setDiaPagamento(e.target.value)}
                />
              </label>

              <label className="dlg__bloco">
                <span className="dlg__rotulo">Contrato até (opcional)</span>
                <input className="dlg__campo" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
              </label>
            </div>

            <div className="dlg__acoes">
              <button type="button" className="dlg__cancelar" onClick={() => setModal(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="dlg__ok"
                onClick={() => {
                  incluir();
                  setModal(false);
                }}
                disabled={criar.isPending || !nome.trim() || !salario}
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PainelFuncionarios;
