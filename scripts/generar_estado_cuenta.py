import json
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_CENTER, TA_RIGHT

json_path = sys.argv[1]
pdf_path  = sys.argv[2]

with open(json_path, 'r') as f:
    d = json.load(f)

color_hex = d['entidad']['color'].lstrip('#')
r, g, b = tuple(int(color_hex[i:i+2], 16)/255 for i in (0, 2, 4))
color_primario = colors.Color(r, g, b)

doc = SimpleDocTemplate(pdf_path, pagesize=A4,
    rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)

styles = getSampleStyleSheet()
estilo_titulo = ParagraphStyle('Titulo', fontSize=18, fontName='Helvetica-Bold', textColor=color_primario, spaceAfter=4)
estilo_sub    = ParagraphStyle('Sub',    fontSize=10, fontName='Helvetica',      textColor=colors.gray,   spaceAfter=2)
estilo_label  = ParagraphStyle('Label',  fontSize=8,  fontName='Helvetica-Bold', textColor=colors.gray,   spaceAfter=4)
estilo_small  = ParagraphStyle('Small',  fontSize=7,  fontName='Helvetica',      textColor=colors.gray)

def fmt(n):
    return "$" + "{:,.0f}".format(n).replace(",", ".")

story = []

# ENCABEZADO
story.append(Paragraph(d['entidad']['nombre'], estilo_titulo))
story.append(Paragraph("CUIT: " + d['entidad']['cuit'] + "  -  Estado de Cuenta emitido el " + d['fechaEmision'], estilo_sub))
story.append(HRFlowable(width='100%', thickness=2, color=color_primario, spaceAfter=12))

# DATOS DEL CLIENTE
story.append(Paragraph("TITULAR DEL CREDITO", estilo_label))
data_cliente = [
    ['Nombre', d['cliente']['nombre'],  'DNI',      d['cliente']['dni']],
    ['CUIL',   d['cliente']['cuil'],    'Legajo',   d['operacionId']],
]
t = Table(data_cliente, colWidths=[3*cm, 7*cm, 3*cm, 4*cm])
t.setStyle(TableStyle([
    ('FONTNAME',      (0,0), (-1,-1), 'Helvetica'),
    ('FONTNAME',      (0,0), (0,-1), 'Helvetica-Bold'),
    ('FONTNAME',      (2,0), (2,-1), 'Helvetica-Bold'),
    ('FONTSIZE',      (0,0), (-1,-1), 9),
    ('TEXTCOLOR',     (0,0), (0,-1), colors.gray),
    ('TEXTCOLOR',     (2,0), (2,-1), colors.gray),
    ('BOTTOMPADDING', (0,0), (-1,-1), 4),
]))
story.append(t)
story.append(Spacer(1, 12))

# RESUMEN FINANCIERO
story.append(Paragraph("RESUMEN FINANCIERO", estilo_label))
fi = d['financiero']
data_fin = [
    ['Monto otorgado',  fmt(fi['montoSolicitado']), 'Cuotas',        str(fi['totalCuotas'])],
    ['Valor de cuota',  fmt(fi['valorCuota']),      'TNA',           str(fi['tna']) + '%'],
    ['Total contrato',  fmt(fi['totalContrato']),   'Total pagado',  fmt(fi['totalPagado'])],
    ['Saldo pendiente', fmt(fi['saldoPendiente']),  'Avance',        str(fi['porcentaje']) + '%'],
]
if fi['diasMora'] > 0:
    data_fin.append(['Dias en mora', str(fi['diasMora']), 'Punitorio acum.', fmt(fi['punitorio'])])

tf = Table(data_fin, colWidths=[4*cm, 6*cm, 3*cm, 4*cm])
tf.setStyle(TableStyle([
    ('FONTNAME',      (0,0), (-1,-1), 'Helvetica'),
    ('FONTNAME',      (0,0), (0,-1), 'Helvetica-Bold'),
    ('FONTNAME',      (2,0), (2,-1), 'Helvetica-Bold'),
    ('FONTSIZE',      (0,0), (-1,-1), 9),
    ('TEXTCOLOR',     (0,0), (0,-1), colors.gray),
    ('TEXTCOLOR',     (2,0), (2,-1), colors.gray),
    ('ROWBACKGROUNDS',(0,0), (-1,-1), [colors.white, colors.Color(0.97,0.97,0.97)]),
    ('GRID',          (0,0), (-1,-1), 0.5, colors.Color(0.9,0.9,0.9)),
    ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ('TOPPADDING',    (0,0), (-1,-1), 5),
]))
story.append(tf)
story.append(Spacer(1, 16))

# PLAN DE CUOTAS
story.append(Paragraph("PLAN DE CUOTAS", estilo_label))
filas_cuotas = [['N', 'Vencimiento', 'Monto', 'Estado']]
for c in d['plan']:
    filas_cuotas.append([str(c['numero']), c['vencimiento'], fmt(c['monto']), c['estado']])

tc = Table(filas_cuotas, colWidths=[1.5*cm, 5*cm, 4*cm, 6.5*cm])
style_cuotas = [
    ('FONTNAME',      (0,0), (-1,0), 'Helvetica-Bold'),
    ('FONTSIZE',      (0,0), (-1,-1), 8),
    ('BACKGROUND',    (0,0), (-1,0), color_primario),
    ('TEXTCOLOR',     (0,0), (-1,0), colors.white),
    ('GRID',          (0,0), (-1,-1), 0.3, colors.Color(0.88,0.88,0.88)),
    ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ('TOPPADDING',    (0,0), (-1,-1), 4),
]
for i, c in enumerate(d['plan'], 1):
    if c['estado'] == 'PAGADA':
        style_cuotas.append(('TEXTCOLOR',  (3,i), (3,i), colors.Color(0.1,0.7,0.3)))
        style_cuotas.append(('BACKGROUND', (0,i), (-1,i), colors.Color(0.94,1,0.95)))
    elif c['estado'] == 'VENCIDA':
        style_cuotas.append(('TEXTCOLOR',  (3,i), (3,i), colors.red))
        style_cuotas.append(('BACKGROUND', (0,i), (-1,i), colors.Color(1,0.95,0.95)))

tc.setStyle(TableStyle(style_cuotas))
story.append(tc)
story.append(Spacer(1, 16))

# HISTORIAL DE PAGOS
if d['pagos']:
    story.append(Paragraph("PAGOS REGISTRADOS", estilo_label))
    filas_pagos = [['Fecha', 'Tipo', 'Monto', 'Observacion']]
    for p in d['pagos']:
        filas_pagos.append([p['fecha'], p['tipo'], fmt(p['monto']), p['observacion'] or '-'])
    tp = Table(filas_pagos, colWidths=[3*cm, 3*cm, 4*cm, 7*cm])
    tp.setStyle(TableStyle([
        ('FONTNAME',      (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE',      (0,0), (-1,-1), 8),
        ('BACKGROUND',    (0,0), (-1,0), colors.Color(0.2,0.2,0.2)),
        ('TEXTCOLOR',     (0,0), (-1,0), colors.white),
        ('ROWBACKGROUNDS',(0,1), (-1,-1), [colors.white, colors.Color(0.97,0.97,0.97)]),
        ('GRID',          (0,0), (-1,-1), 0.3, colors.Color(0.88,0.88,0.88)),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING',    (0,0), (-1,-1), 4),
    ]))
    story.append(tp)

# PIE
story.append(Spacer(1, 20))
story.append(HRFlowable(width='100%', thickness=0.5, color=colors.Color(0.8,0.8,0.8)))
story.append(Spacer(1, 6))
story.append(Paragraph("Documento generado automaticamente por Simply Originacion - " + d['fechaEmision'], estilo_small))

doc.build(story)
print("OK")
