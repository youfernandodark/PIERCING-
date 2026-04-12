import json
from datetime import datetime

# Nome do seu arquivo de agenda
FILE_PATH = 'agenda.json'

def carregar_agenda():
    try:
        with open(FILE_PATH, 'r', encoding='utf-8') as file:
            return json.load(file)
    except FileNotFoundError:
        print("Erro: Arquivo agenda.json não encontrado.")
        return []

def exibir_proximos_agendamentos():
    agenda = carregar_agenda()
    hoje = datetime.now().strftime('%Y-%m-%d')
    
    print(f"--- Agenda de Tatuagens (Hoje: {hoje}) ---\n")
    
    # Ordenar por data
    agenda_ordenada = sorted(agenda, key=lambda x: x['data'])
    
    for item in agenda_ordenada:
        # Mostra agendamentos de hoje em diante
        if item['data'] >= hoje:
            print(f"[{item['data']} às {item['horario']}] - {item['cliente']}")
            print(f"  > Estilo: {item['detalhes']['tema']} | Local: {item['detalhes']['local']}")
            print(f"  > Status: {item['status']} | Valor: R${item['financeiro']['valor_total']}")
            print("-" * 40)

if __name__ == "__main__":
    exibir_proximos_agendamentos()
