import json
from datetime import datetime

# Configurações de cores para o terminal (opcional)
GREEN = "\033[92m"
RED = "\033[91m"
RESET = "\033[0m"

def carregar_agenda():
    try:
        with open('agenda.json', 'r', encoding='utf-8') as file:
            return json.load(file)
    except (FileNotFoundError, json.JSONDecodeError):
        return []

def gerar_html(agenda):
    # CSS Moderno com foco em legibilidade e estética Dark
    html_content = f"""
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{ font-family: 'Segoe UI', sans-serif; background: #0a0a0a; color: #e0e0e0; padding: 40px; }}
            .container {{ max-width: 1000px; margin: auto; }}
            h1 {{ border-bottom: 2px solid #333; padding-bottom: 10px; color: #fff; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 20px; background: #1a1a1a; }}
            th {{ background: #252525; color: #aaa; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; }}
            th, td {{ padding: 15px; text-align: left; border-bottom: 1px solid #333; }}
            tr:hover {{ background: #222; }}
            .status {{ font-weight: bold; border-radius: 4px; padding: 4px 8px; font-size: 0.9em; }}
            .pendente {{ background: #442222; color: #ff9999; }}
            .confirmado {{ background: #224422; color: #99ff99; }}
            .financeiro {{ color: #ffd700; font-family: monospace; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Agenda DARK013TATTOO</h1>
            <p>Atualizado em: {datetime.now().strftime('%d/%m/%Y %H:%M')}</p>
            <table>
                <thead>
                    <tr><th>Data/Hora</th><th>Cliente</th><th>Trabalho</th><th>Status</th><th>Valor</th></tr>
                </thead>
                <tbody>
    """
    
    for item in sorted(agenda, key=lambda x: x['data']):
        status_class = "confirmado" if item['status'] == "confirmado" else "pendente"
        html_content += f"""
            <tr>
                <td>{datetime.strptime(item['data'], '%Y-%m-%d').strftime('%d/%m')} - {item['horario']}</td>
                <td><strong>{item['cliente']}</strong><br><small>{item['contato']}</small></td>
                <td>{item['detalhes']['tema']} ({item['detalhes']['local']})</td>
                <td><span class="status {status_class}">{item['status'].upper()}</span></td>
                <td class="financeiro">R$ {item['financeiro']['valor_total']:.2f}</td>
            </tr>
        """
    
    html_content += "</tbody></table></div></body></html>"
    
    with open('agenda.html', 'w', encoding='utf-8') as f:
        f.write(html_content)

def executar():
    agenda = carregar_agenda()
    hoje = datetime.now().strftime('%Y-%m-%d')
    total_a_receber = 0
    
    print(f"\n{'='*50}")
    print(f"   RESUMO DARK013TATTOO - {hoje}")
    print(f"{'='*50}\n")
    
    for item in sorted(agenda, key=lambda x: x['data']):
        if item['data'] >= hoje:
            cor = GREEN if item['status'] == 'confirmado' else RED
            print(f"[{item['data']}] {item['horario']} | {item['cliente'].ljust(15)} | {cor}{item['status'].upper()}{RESET}")
            total_a_receber += item['financeiro']['valor_pendente']
    
    print(f"\n{'-'*50}")
    print(f"Saldo Pendente Total: {GREEN}R$ {total_a_receber:.2f}{RESET}")
    print(f"{'-'*50}")
    
    gerar_html(agenda)
    print("\n[!] Dashboard HTML atualizado!")

if __name__ == "__main__":
    executar()
