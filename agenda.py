import json
from datetime import datetime

FILE_PATH = 'agenda.json'
HTML_PATH = 'agenda.html'

def carregar_agenda():
    try:
        with open(FILE_PATH, 'r', encoding='utf-8') as file:
            return json.load(file)
    except FileNotFoundError:
        print("Erro: Arquivo agenda.json não encontrado.")
        return []

def gerar_html(agenda):
    html_content = f"""
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: sans-serif; background: #121212; color: #fff; padding: 20px; }}
            table {{ width: 100%; border-collapse: collapse; }}
            th, td {{ padding: 12px; border: 1px solid #333; text-align: left; }}
            th {{ background: #222; }}
            .pendente {{ color: #ff9999; }}
            .confirmado {{ color: #99ff99; }}
        </style>
    </head>
    <body>
        <h1>Agenda DARK013TATTOO - {datetime.now().strftime('%d/%m/%Y')}</h1>
        <table>
            <tr><th>Data</th><th>Cliente</th><th>Estilo</th><th>Status</th><th>Valor</th></tr>
    """
    
    for item in sorted(agenda, key=lambda x: x['data']):
        html_content += f"""
            <tr>
                <td>{item['data']}</td>
                <td>{item['cliente']}</td>
                <td>{item['detalhes']['tema']}</td>
                <td class="{item['status']}">{item['status']}</td>
                <td>R$ {item['financeiro']['valor_total']}</td>
            </tr>
        """
    
    html_content += "</table></body></html>"
    
    with open(HTML_PATH, 'w', encoding='utf-8') as f:
        f.write(html_content)
    print(f"\n[!] Arquivo '{HTML_PATH}' gerado com sucesso!")

def executar():
    agenda = carregar_agenda()
    hoje = datetime.now().strftime('%Y-%m-%d')
    
    print(f"--- Resumo DARK013TATTOO (Hoje: {hoje}) ---\n")
    
    for item in sorted(agenda, key=lambda x: x['data']):
        if item['data'] >= hoje:
            print(f"[{item['data']}] {item['cliente']} | {item['detalhes']['tema']} | R${item['financeiro']['valor_total']}")
    
    gerar_html(agenda)

if __name__ == "__main__":
    executar()
