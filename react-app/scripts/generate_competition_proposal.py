from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


FONT_NAME = "Malgun Gothic"
TITLE_COLOR = RGBColor(22, 54, 90)
HEADING_COLOR = RGBColor(46, 116, 181)
HEADING_DARK = RGBColor(31, 77, 120)
TEXT_COLOR = RGBColor(34, 34, 34)
MUTED_COLOR = RGBColor(90, 90, 90)
LIGHT_FILL = "EEF4FB"
MILD_FILL = "F7F9FC"
BORDER_COLOR = "D8DEE8"

OUTPUT_NAME = "(구현Track) 에이전트 부문 아이디어 기획서_수정본.docx"


def set_run_font(
    run,
    *,
    size=None,
    bold=None,
    color=None,
    italic=None,
):
    run.font.name = FONT_NAME
    run._element.rPr.rFonts.set(qn("w:ascii"), FONT_NAME)
    run._element.rPr.rFonts.set(qn("w:hAnsi"), FONT_NAME)
    run._element.rPr.rFonts.set(qn("w:eastAsia"), FONT_NAME)
    if size is not None:
        run.font.size = Pt(size)
    if bold is not None:
        run.bold = bold
    if italic is not None:
        run.italic = italic
    if color is not None:
        run.font.color.rgb = color


def set_paragraph_spacing(paragraph, *, before=0, after=6, line=1.15):
    fmt = paragraph.paragraph_format
    fmt.space_before = Pt(before)
    fmt.space_after = Pt(after)
    fmt.line_spacing = line


def shade_cell(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_border(cell, color=BORDER_COLOR, size="8"):
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_borders = tc_pr.first_child_found_in("w:tcBorders")
    if tc_borders is None:
        tc_borders = OxmlElement("w:tcBorders")
        tc_pr.append(tc_borders)

    for edge in ("top", "left", "bottom", "right"):
        edge_el = tc_borders.find(qn(f"w:{edge}"))
        if edge_el is None:
            edge_el = OxmlElement(f"w:{edge}")
            tc_borders.append(edge_el)
        edge_el.set(qn("w:val"), "single")
        edge_el.set(qn("w:sz"), size)
        edge_el.set(qn("w:color"), color)


def set_cell_text(
    cell,
    text,
    *,
    bold=False,
    size=10.5,
    color=TEXT_COLOR,
    align=WD_ALIGN_PARAGRAPH.LEFT,
):
    cell.text = ""
    paragraph = cell.paragraphs[0]
    paragraph.alignment = align
    set_paragraph_spacing(paragraph, before=0, after=2, line=1.15)
    run = paragraph.add_run(text)
    set_run_font(run, size=size, bold=bold, color=color)
    cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    set_cell_border(cell)


def set_table_widths(table, widths):
    table.autofit = False
    for column, width in zip(table.columns, widths):
        for cell in column.cells:
            cell.width = Inches(width)


def add_page_number(paragraph):
    paragraph.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = paragraph.add_run("Page ")
    set_run_font(run, size=9, color=MUTED_COLOR)

    fld_begin = OxmlElement("w:fldChar")
    fld_begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = " PAGE "
    fld_end = OxmlElement("w:fldChar")
    fld_end.set(qn("w:fldCharType"), "end")

    run._r.append(fld_begin)
    run._r.append(instr)
    run._r.append(fld_end)


def apply_document_styles(doc):
    section = doc.sections[0]
    section.top_margin = Inches(1)
    section.bottom_margin = Inches(1)
    section.left_margin = Inches(1)
    section.right_margin = Inches(1)
    section.header_distance = Inches(0.492)
    section.footer_distance = Inches(0.492)

    normal = doc.styles["Normal"]
    normal.font.name = FONT_NAME
    normal._element.rPr.rFonts.set(qn("w:ascii"), FONT_NAME)
    normal._element.rPr.rFonts.set(qn("w:hAnsi"), FONT_NAME)
    normal._element.rPr.rFonts.set(qn("w:eastAsia"), FONT_NAME)
    normal.font.size = Pt(10.5)
    normal.font.color.rgb = TEXT_COLOR

    for style_name, size, color, bold in [
        ("Heading 1", 16, HEADING_COLOR, True),
        ("Heading 2", 12.5, HEADING_COLOR, True),
        ("Heading 3", 11.5, HEADING_DARK, True),
        ("List Bullet", 10.5, TEXT_COLOR, False),
        ("List Number", 10.5, TEXT_COLOR, False),
    ]:
        style = doc.styles[style_name]
        style.font.name = FONT_NAME
        style._element.rPr.rFonts.set(qn("w:ascii"), FONT_NAME)
        style._element.rPr.rFonts.set(qn("w:hAnsi"), FONT_NAME)
        style._element.rPr.rFonts.set(qn("w:eastAsia"), FONT_NAME)
        style.font.size = Pt(size)
        style.font.color.rgb = color
        style.font.bold = bold

    footer = section.footer
    footer_p = footer.paragraphs[0]
    footer_p.text = ""
    footer_run = footer_p.add_run("AI 경진대회 기획서 수정본 | NH-AGri react-app 기반")
    set_run_font(footer_run, size=9, color=MUTED_COLOR)
    footer_p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    add_page_number(footer.add_paragraph())


def add_title_paragraph(doc, text, *, size=22, after=6, color=TITLE_COLOR):
    paragraph = doc.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    set_paragraph_spacing(paragraph, before=0, after=after, line=1.0)
    run = paragraph.add_run(text)
    set_run_font(run, size=size, bold=True, color=color)
    return paragraph


def add_body_paragraph(doc, text, *, before=0, after=6, bold=False, color=TEXT_COLOR):
    paragraph = doc.add_paragraph()
    set_paragraph_spacing(paragraph, before=before, after=after, line=1.15)
    run = paragraph.add_run(text)
    set_run_font(run, size=10.5, bold=bold, color=color)
    return paragraph


def add_heading(doc, text, level=1):
    paragraph = doc.add_paragraph(style=f"Heading {level}")
    set_paragraph_spacing(
        paragraph,
        before=16 if level == 1 else 10,
        after=6 if level == 1 else 4,
        line=1.0,
    )
    run = paragraph.add_run(text)
    set_run_font(
        run,
        size=16 if level == 1 else 12.5 if level == 2 else 11.5,
        bold=True,
        color=HEADING_COLOR if level < 3 else HEADING_DARK,
    )
    return paragraph


def add_bullet(doc, text):
    paragraph = doc.add_paragraph(style="List Bullet")
    set_paragraph_spacing(paragraph, before=0, after=4, line=1.15)
    run = paragraph.add_run(text)
    set_run_font(run, size=10.5, color=TEXT_COLOR)
    return paragraph


def add_number(doc, text):
    paragraph = doc.add_paragraph(style="List Number")
    set_paragraph_spacing(paragraph, before=0, after=4, line=1.15)
    run = paragraph.add_run(text)
    set_run_font(run, size=10.5, color=TEXT_COLOR)
    return paragraph


def add_note_box(doc, text):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    set_table_widths(table, [6.5])
    cell = table.cell(0, 0)
    shade_cell(cell, LIGHT_FILL)
    set_cell_border(cell, color="BFD0E5")
    set_cell_text(cell, text, size=10.5)
    return table


def add_two_col_summary_table(doc, rows):
    table = doc.add_table(rows=0, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    set_table_widths(table, [1.5, 5.0])
    for label, value in rows:
        cells = table.add_row().cells
        shade_cell(cells[0], MILD_FILL)
        set_cell_text(cells[0], label, bold=True, size=10.2, color=HEADING_DARK)
        set_cell_text(cells[1], value, size=10.2)
    return table


def add_three_col_table(doc, headers, rows, widths):
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    set_table_widths(table, widths)
    header_cells = table.rows[0].cells
    for index, text in enumerate(headers):
        shade_cell(header_cells[index], LIGHT_FILL)
        set_cell_text(
            header_cells[index],
            text,
            bold=True,
            size=10.2,
            color=HEADING_DARK,
            align=WD_ALIGN_PARAGRAPH.CENTER,
        )
    for row in rows:
        cells = table.add_row().cells
        for index, value in enumerate(row):
            set_cell_text(cells[index], value, size=10.0)
    return table


def add_first_page(doc):
    add_title_paragraph(doc, "구현 Track 경진대회 기획서", size=24, after=3)
    add_title_paragraph(doc, "Agent 부문", size=16, after=14, color=HEADING_COLOR)

    intro = doc.add_paragraph()
    intro.alignment = WD_ALIGN_PARAGRAPH.CENTER
    set_paragraph_spacing(intro, before=0, after=18, line=1.15)
    run = intro.add_run(
        "실무 효율성과 현장 활용성을 중심으로, 현재 react-app 구현 흐름을 반영해 보강한 제안서 초안"
    )
    set_run_font(run, size=10.5, color=MUTED_COLOR)

    add_heading(doc, "1. 개요", level=1)

    add_two_col_summary_table(
        doc,
        [
            ("에이전트명", "AI Agent 기반 농자재 상품정보 정제 및 안내 페이지 자동 생성 시스템"),
            (
                "한 줄 소개",
                "사무소에서 사용하는 엑셀 가격표를 업로드하면 AI가 검토 포인트를 제안하고, 사무소별 상품 안내 페이지와 QR을 자동 생성·업데이트하는 현장형 에이전트",
            ),
            ("해결 분야", "Work (반복·비효율 업무를 AI로 지원)"),
            ("주요 사용자", "생산경제·자재 담당 직원, 사무소 관리자, 현장 고객 응대 인력"),
        ],
    )

    add_body_paragraph(doc, "")
    participant_table = add_three_col_table(
        doc,
        ["성명", "소속", "사번 / 역할"],
        [
            ("안호건", "발안농협", "132400608 / 기획·개발"),
            ("", "", ""),
        ],
        [1.5, 2.1, 2.9],
    )
    participant_table.rows[0].cells[2].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER

    add_body_paragraph(doc, "")
    add_note_box(
        doc,
        "핵심 메시지: 이 제안은 단순한 아이디어가 아니라, 현재 구현된 react-app의 데이터 정제·사무소별 저장·AI 기반 페이지 생성·QR 배포 흐름을 바탕으로 실제 업무 적용 시나리오를 구체화한 현장형 기획서이다.",
    )

    add_body_paragraph(
        doc,
        "작성 메모: 제출 전 참가자 정보, 예상 절감 시간, 사무소명 등은 실제 제출 기준으로 최종 보정하면 된다. 상세 서비스 흐름과 구현 근거는 뒤쪽 장에서 구체적으로 설명한다.",
        before=8,
        after=0,
        color=MUTED_COLOR,
    )


def add_problem_page(doc):
    doc.add_page_break()
    add_heading(doc, "2. 문제인식 및 필요성", level=1)

    add_heading(doc, "현재 업무의 주요 문제", level=2)
    for item in [
        "가격 변동이나 판매 정책 변경이 발생하면 기존 가격표와 포스터를 다시 수정·출력해야 해 반영 속도가 느리다.",
        "기존 가격표는 단가 중심 정보에 치우쳐 있어 성분, 사용량, 특장점, 주의사항 같은 구매 판단 정보가 부족하다.",
        "계통 등록 전체 상품이 한 번에 노출되면 실제 사무소에서 취급하는 품목만 빠르게 골라 안내하기 어렵다.",
        "엑셀 데이터에 같은 상품의 중복 등록, 가격 역전, 누락 정보가 섞여 있어 현장 반영 전에 검토 시간이 많이 든다.",
        "종이 안내물은 한번 출력되면 최신 가격이나 구성 변경을 즉시 반영하기 어려워 이전 정보와 최신 정보가 혼재된다.",
    ]:
        add_bullet(doc, item)

    add_heading(doc, "왜 지금 필요한가", level=2)
    add_body_paragraph(
        doc,
        "현재 react-app은 엑셀 업로드부터 검토 추천, 사무소별 저장, 모바일 안내 페이지 생성까지 하나의 흐름으로 연결되어 있다. 즉, 이번 제안은 새로 시작하는 아이디어라기보다 이미 구현된 기능을 실제 현장 문제 해결 프레임으로 정리해 확장하는 작업에 가깝다.",
    )
    add_body_paragraph(
        doc,
        "농자재 업무는 가격 변동 빈도가 높고, 현장에서는 빠른 설명과 신뢰 가능한 최신 정보가 중요하다. 따라서 '데이터 정제'와 '안내 페이지 생성'을 분리하지 않고 한 흐름으로 묶는 것이 실질적 효과를 크게 만든다.",
    )

    add_heading(doc, "에이전트 도입 시 기대 변화", level=2)
    for item in [
        "수정 업무를 엑셀 재편집 중심에서 데이터 업로드·검토·재배포 중심으로 단순화한다.",
        "사무소별 실제 취급 품목만 골라 안내해 고객 응대 정확도와 설명 속도를 높인다.",
        "AI를 '완전 자동 결정'이 아니라 '검토 우선순위 제시와 디자인 초안 생성'에 사용해 실무 적용성을 높인다.",
        "QR 기반 공개 페이지를 통해 종이 안내물의 한계를 줄이고 최신 정보 접근성을 높인다.",
    ]:
        add_bullet(doc, item)


def add_feature_page(doc):
    doc.add_page_break()
    add_heading(doc, "3. 핵심 기능 및 서비스 흐름", level=1)

    add_heading(doc, "핵심 기능", level=2)
    add_three_col_table(
        doc,
        ["기능", "현재 구현 내용", "실무 효과"],
        [
            (
                "엑셀 업로드·정규화",
                "가격표 시트를 읽어 헤더/데이터 시작 행을 분석하고 상품 행을 정규화",
                "수작업 전처리 없이 원본 엑셀을 바로 검토 가능한 구조로 전환",
            ),
            (
                "검토 추천",
                "규칙 기반 이상치 탐지와 OpenAI 기반 검토 추천을 함께 제공",
                "중복 의심·가격 이상치·확인 필요 항목을 먼저 점검",
            ),
            (
                "사무소별 데이터 저장",
                "카테고리별 상품 데이터를 사무소 코드 기준으로 분리 저장",
                "여러 사무소가 같은 시스템을 써도 자기 데이터만 관리 가능",
            ),
            (
                "AI 페이지/카드 디자인",
                "페이지 스타일과 카드 구성을 자연어 요청으로 조정하고 실시간 미리보기 제공",
                "안내물 품질 편차를 줄이고 수정 시간을 단축",
            ),
            (
                "공개 페이지 및 QR 배포",
                "사무소별 공개 URL과 QR 인쇄 자산 생성",
                "현장에서 최신 상품 정보를 모바일로 즉시 안내",
            ),
        ],
        [1.5, 2.4, 2.6],
    )

    add_heading(doc, "서비스 처리 흐름", level=2)
    for item in [
        "1단계: 사용자가 엑셀을 업로드하면 시트 구조를 분석해 상품 행을 추출한다.",
        "2단계: 추출 결과를 기준으로 데이터 이상치, 중복 의심, 확인 필요 항목을 AI와 규칙으로 점검한다.",
        "3단계: 사무소별로 필요한 카테고리와 노출 필드를 선택하고 저장한다.",
        "4단계: 페이지 분위기와 카드 구성은 AI 보조를 통해 자연어로 수정하고 즉시 미리본다.",
        "5단계: 최종 결과는 공개 페이지와 QR로 연결되어 현장 배포에 바로 활용된다.",
    ]:
        add_number(doc, item)

    add_note_box(
        doc,
        "차별점: 대부분의 생성형 AI 데모가 '답변 생성'에 머무는 반면, 본 시스템은 엑셀 데이터 정제와 현장용 결과물 생성까지 하나의 업무 워크플로우로 연결한다.",
    )


def add_scenario_page(doc):
    doc.add_page_break()
    add_heading(doc, "4. 사용자 예상 시나리오", level=1)

    scenarios = [
        (
            "시나리오 1. 가격 변동 발생 시 최신 가격을 빠르게 반영",
            "담당 직원이 새 엑셀 파일을 업로드하면 변경된 가격을 반영한 데이터와 안내 페이지를 다시 저장할 수 있다. 이후 기존 공개 페이지는 최신 정보 기준으로 갱신되므로, 현장에서는 종이 가격표 재작업 없이 QR 중심으로 최신 가격을 안내할 수 있다.",
        ),
        (
            "시나리오 2. 사무소에서 실제 취급하는 품목만 선별해 안내",
            "계통 등록 전체 상품 대신 실제 사무소에서 판매하는 카테고리와 상품만 선택해 고객용 안내 페이지를 구성할 수 있다. 이를 통해 고객은 필요한 상품군만 빠르게 확인하고, 직원은 설명 범위를 줄여 응대 효율을 높일 수 있다.",
        ),
        (
            "시나리오 3. 엑셀 업로드 직후 오류 검토 포인트를 먼저 확인",
            "시스템은 가격 역전, 중복 의심, 핵심 정보 충돌 가능성이 있는 항목을 추천 형태로 제시한다. 담당자는 모든 행을 처음부터 다시 읽지 않고도 우선 점검할 부분부터 확인할 수 있어 현장 반영 전 오류 가능성을 줄일 수 있다.",
        ),
        (
            "시나리오 4. 현장에서 모바일 안내 페이지와 QR로 설명 보조",
            "고객 응대 시 직원은 종이 안내물뿐 아니라 사무소별 모바일 안내 페이지를 함께 보여줄 수 있다. QR을 통해 고객이 직접 페이지를 확인할 수 있으므로, 가격 외에 상품 특징·노출 정보·시각적 구성까지 포함한 설명이 가능해진다.",
        ),
    ]

    for title, body in scenarios:
        add_heading(doc, title, level=2)
        add_body_paragraph(doc, body)


def add_ai_page(doc):
    doc.add_page_break()
    add_heading(doc, "5. AI 활용 계획", level=1)

    add_heading(doc, "AI 활용 영역", level=2)
    add_three_col_table(
        doc,
        ["활용 영역", "입력", "출력"],
        [
            (
                "엑셀 검토 추천",
                "정규화된 상품 행, 가격/상품코드/규격 정보",
                "중복 의심, 가격 이상치, 수기 확인 필요 추천",
            ),
            (
                "페이지 스타일 보조",
                "페이지 분위기 요청, 현재 페이지 스타일, 범위(scope)",
                "구조화된 JSON 의도와 페이지 스타일 수정안",
            ),
            (
                "카드 디자인 보조",
                "노출 필드, 상품 카테고리, 현재 카드 스타일",
                "구조화된 JSON 의도와 카드 레이아웃·본문 슬롯 수정안",
            ),
        ],
        [1.7, 2.3, 2.5],
    )

    add_heading(doc, "AI Agent 역할 분리", level=2)
    for item in [
        "검토 추천 에이전트: 상품 행을 읽고 이상치·중복 의심·확인 포인트를 제안한다.",
        "페이지 스타일 에이전트: 현재 페이지 상태와 요청을 해석해 스타일 의도를 생성한다.",
        "카드 디자인 에이전트: 노출 필드와 카테고리를 바탕으로 카드 배치 초안을 제안한다.",
    ]:
        add_bullet(doc, item)

    add_heading(doc, "활용 예정 AI 도구 및 방식", level=2)
    for item in [
        "OpenAI Responses API로 구조화된 JSON 응답을 받고, 프론트엔드 컴파일러가 이를 실제 설정으로 반영한다.",
        "gpt-4.1-mini를 기본 모델로 사용하고, 페이지 스타일·카드 스타일·검토 추천을 목적별 프롬프트로 분리 처리한다.",
        "AI 결과는 바로 저장하지 않고 사용자가 미리보기와 검토 결과를 확인한 뒤 반영 여부를 선택한다.",
    ]:
        add_bullet(doc, item)

    add_heading(doc, "안전장치", level=2)
    for item in [
        "AI 요청은 officeCode, 현재 스타일, 노출 필드, 검토 대상 상품 정보 등 업무용 비민감 데이터 중심으로 제한한다.",
        "AI 요청 API는 인증된 사용자 세션과 officeCode 소유권 검증을 거쳐야만 실행되도록 한다.",
        "프롬프트 길이, 요청 본문 크기, 대화 이력 길이를 제한하고, 추천 결과는 자동 수정이 아닌 '확인 필요 항목' 제안으로만 사용한다.",
    ]:
        add_bullet(doc, item)


def add_implementation_page(doc):
    doc.add_page_break()
    add_heading(doc, "6. 구동 방식(계획) 및 현재 구현 현황", level=1)

    add_heading(doc, "시스템 구성", level=2)
    add_three_col_table(
        doc,
        ["구성 요소", "기술/구현", "설명"],
        [
            (
                "프론트엔드",
                "React 19 + Vite",
                "로그인, 대시보드, 엑셀 검토 화면, 스토어프런트 빌더, 공개 페이지까지 단일 앱에서 구성",
            ),
            (
                "데이터/인증",
                "Supabase Auth + DB",
                "login_users, office_product_datas, office_page_config, office_page_category_configs 기반 분리 저장",
            ),
            (
                "AI 요청 API",
                "Functions + OpenAI Responses API",
                "페이지 스타일·카드 스타일 요청을 구조화 JSON으로 중계하고 검증",
            ),
            (
                "현장 배포",
                "공개 URL + QR 생성",
                "office 코드 기반 공개 페이지 링크와 QR 인쇄 자산 생성",
            ),
        ],
        [1.5, 1.9, 3.1],
    )

    add_heading(doc, "AI Agent 동작 루프", level=2)
    for item in [
        "1단계 상태 수집: officeCode, 현재 상품 데이터, 페이지 스타일, 카드 구성, 사용자 요청을 함께 읽는다.",
        "2단계 의도 해석: 자연어 요청을 구조화된 의도(JSON)로 변환해 어떤 범위를 어떻게 바꿀지 명확히 한다.",
        "3단계 초안 생성: 검토 추천, 페이지 스타일, 카드 레이아웃 초안을 만들고 미리보기 가능한 상태로 컴파일한다.",
        "4단계 승인 후 반영: 담당자가 결과를 검토하고 저장할 때만 실제 사무소 데이터와 공개 페이지에 반영한다.",
    ]:
        add_bullet(doc, item)

    add_heading(doc, "현재 구현 기준 주요 화면", level=2)
    for item in [
        "로그인/대시보드: 사번 기반 계정 생성, 사무소 코드 연동, 주요 도구 진입",
        "상품 데이터 편집 화면: 엑셀 업로드, 검토 추천, 검색/필터, 저장",
        "스토어프런트 빌더: 카테고리 선택, 페이지 디자인, 데이터 필드 선택, 카드 디자인",
        "공개 스토어프런트: 사무소별 모바일 안내 페이지 렌더링",
        "QR 출력 기능: 공개 페이지 주소를 SVG/PNG/인쇄용 형태로 생성",
    ]:
        add_bullet(doc, item)

    add_heading(doc, "현재 구현 상태 정리", level=2)
    for item in [
        "구현 완료: 엑셀 시트 구조 분석, 규칙 기반 검토 추천, 페이지 스타일 AI, 카드 디자인 AI, 사무소별 공개 페이지, QR 내보내기",
        "조건부 활용: OpenAI 검토 추천은 API 키 연결 시 보조 추천으로 동작하며, 미연동 환경에서는 로컬 규칙 기반 흐름으로 운영 가능",
        "운영 관점 장점: 구현 상태가 기능 단위로 분리되어 있어 시연, 고도화, 사무소별 확장 설명이 쉽다.",
    ]:
        add_bullet(doc, item)

    add_note_box(
        doc,
        "왜 이 시스템이 AI Agent인가: 이 시스템은 단순히 문구를 생성하는 AI가 아니라, 현재 데이터 상태와 사용자 요청을 함께 해석하고, 역할별로 초안을 만들고, 사용자 승인 이후에만 결과를 반영하는 상태 기반 업무형 에이전트로 동작한다.",
    )


def add_effect_page(doc):
    doc.add_page_break()
    add_heading(doc, "7. 기대 효과 및 KPI", level=1)

    add_heading(doc, "정량·정성 기대 효과", level=2)
    add_three_col_table(
        doc,
        ["항목", "기존 방식", "도입 후 목표"],
        [
            (
                "가격표/안내물 수정 시간",
                "엑셀 수정 후 재편집·재출력 중심",
                "업로드-검토-저장 중심으로 전환해 수정 시간 50~70% 단축 목표",
            ),
            (
                "현장 정보 최신성",
                "출력물 기준으로 최신성 유지가 어려움",
                "공개 페이지와 QR을 통해 최신 정보 중심 안내",
            ),
            (
                "설명 정확도",
                "담당자 개인 숙련도에 따라 편차 발생",
                "사무소별 표준 페이지와 선택 필드 중심 설명",
            ),
            (
                "데이터 검토 효율",
                "전체 행을 수작업으로 다시 확인",
                "AI/규칙 추천으로 우선 검토 포인트부터 점검",
            ),
            (
                "확장성",
                "사무소별 별도 문서 재작업 필요",
                "같은 구조를 여러 사무소에 재사용 가능",
            ),
        ],
        [1.5, 2.35, 2.65],
    )

    add_heading(doc, "운영 KPI 예시", level=2)
    for item in [
        "엑셀 업로드 후 안내 페이지 반영까지 걸리는 평균 시간",
        "AI 추천이 생성한 검토 포인트 중 실제 수정/확인으로 이어진 비율",
        "사무소별 등록 카테고리 수와 공개 페이지 운영 횟수",
        "가격 변동 이후 최신 페이지 갱신 완료까지의 리드타임",
        "QR 페이지 조회 수 및 현장 활용 빈도",
    ]:
        add_bullet(doc, item)

    add_note_box(
        doc,
        "심사 포인트 제안: 본 프로젝트의 핵심 가치는 'AI가 멋진 문구를 쓰는 것'보다 '실제 반복 업무를 줄이고 최신 정보 전달 속도를 높이는 것'에 있다는 점을 강조하는 것이 좋다.",
    )


def add_expansion_page(doc):
    doc.add_page_break()
    add_heading(doc, "8. 확산 가능성", level=1)

    add_heading(doc, "다른 사무소·다른 팀으로의 확산", level=2)
    for item in [
        "같은 형식의 가격표를 사용하는 다른 사무소도 office 코드 기준으로 분리 운영할 수 있어 시스템 공용화가 쉽다.",
        "사무소별로 노출 카테고리와 페이지 구성을 다르게 관리할 수 있어 공통 플랫폼과 현장 맞춤형 운영을 동시에 만족시킨다.",
        "현재는 비료·농약 중심 흐름이지만, 향후 종자·자재·생활물자 등 다른 품목군으로 확장할 수 있다.",
        "가격표뿐 아니라 행사 안내, 계절 상품 추천, 신규 상품 소개 페이지 등 다른 고객 접점 업무에도 응용 가능하다.",
    ]:
        add_bullet(doc, item)

    add_heading(doc, "고도화 로드맵", level=2)
    add_three_col_table(
        doc,
        ["단계", "목표", "주요 내용"],
        [
            ("1단계", "현재 흐름 안정화", "엑셀 검토 정확도 개선, 사무소별 운영 가이드 정리"),
            ("2단계", "안내 정보 보강", "성분·사용량·주의사항·이미지 링크 연계 고도화"),
            ("3단계", "품목 확장", "종자·자재 등 타 카테고리 데이터 구조 추가"),
            ("4단계", "운영 분석", "조회 통계, 추천 반영률, 자주 수정되는 항목 분석"),
        ],
        [0.9, 1.6, 4.0],
    )


def add_security_page(doc):
    doc.add_page_break()
    add_heading(doc, "9. 운영·보안 준수 및 향후 계획", level=1)

    add_heading(doc, "운영 및 보안 원칙", level=2)
    for item in [
        "사무소 단위 권한 분리를 위해 로그인 사용자와 office_code의 소유 관계를 검증한다.",
        "외부 AI 서비스에는 고객 개인정보가 아닌 상품·스타일·검토용 비민감 데이터만 입력하는 것을 원칙으로 한다.",
        "OpenAI 사용이 어려운 환경에서도 규칙 기반 추천과 로컬 휴리스틱 모드를 통해 핵심 흐름이 동작하도록 설계한다.",
        "실운영 이전에는 AI 요청 로그 범위, 데이터 반출 정책, 공개 페이지 노출 범위를 별도로 점검한다.",
    ]:
        add_bullet(doc, item)

    add_heading(doc, "제출 전 최종 수정 포인트", level=2)
    for item in [
        "참가자 구성, 역할, 제출일을 실제 제출본 기준으로 최종 수정",
        "예상 절감 시간과 KPI 수치를 내부 검토 후 확정",
        "필요 시 사무소명, 예시 시나리오, 용어를 발표용 문체에 맞춰 더 간결하게 보정",
    ]:
        add_bullet(doc, item)

    add_heading(doc, "개인정보 및 보안 준수 확인", level=2)
    add_note_box(
        doc,
        "□ 본 팀은 과제 수행 과정에서 회사 기밀, 고객 개인정보 등 민감 자료를 외부 AI 서비스에 입력하거나 유출하지 않을 것을 확인합니다. 또한 제출 전 보안 기준과 공개 범위를 다시 점검하겠습니다.",
    )

    add_body_paragraph(doc, "")
    sign_table = doc.add_table(rows=4, cols=2)
    sign_table.alignment = WD_TABLE_ALIGNMENT.RIGHT
    sign_table.autofit = False
    set_table_widths(sign_table, [1.5, 3.0])
    sign_rows = [
        ("제출일", "2026년     월     일"),
        ("팀장 성명", "(서명)"),
        ("팀원 성명", "(서명)"),
        ("팀원 성명", "(서명)"),
    ]
    for row, (label, value) in zip(sign_table.rows, sign_rows):
        shade_cell(row.cells[0], MILD_FILL)
        set_cell_text(row.cells[0], label, bold=True, color=HEADING_DARK)
        set_cell_text(row.cells[1], value)


def build_document():
    doc = Document()
    apply_document_styles(doc)
    add_first_page(doc)
    add_problem_page(doc)
    add_feature_page(doc)
    add_scenario_page(doc)
    add_ai_page(doc)
    add_implementation_page(doc)
    add_effect_page(doc)
    add_expansion_page(doc)
    add_security_page(doc)
    return doc


def main():
    root_dir = Path(__file__).resolve().parents[1]
    output_path = root_dir / OUTPUT_NAME
    document = build_document()
    document.save(output_path)
    print(output_path)


if __name__ == "__main__":
    main()
