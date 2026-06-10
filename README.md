# 우리 가족 추억 기록장

가족과 함께한 추억을 사진, 날짜, 장소, 이야기로 정리하는 정적 HTML 홈페이지입니다.

## 파일 구성

- `index.html`: 홈페이지 본문
- `style.css`: 화면 디자인
- `script.js`: 추억 목록 렌더링과 필터 기능
- `data/memories.json`: 추억 데이터
- `assets/photos/`: 사진 파일 보관 폴더

## 가족 구성원 사진 기능

홈페이지의 `가족` 메뉴에서 구성원 이름을 수정하고 사진을 선택할 수 있습니다.
이 기능은 정적 HTML 안에서 동작하므로 선택한 사진은 서버에 업로드되지 않고,
현재 브라우저의 저장소에만 보관됩니다.

## 추억 추가 방법

1. 사진을 `assets/photos/` 폴더에 넣습니다.
2. `data/memories.json`에 항목을 추가합니다.
3. 사진을 쓰는 경우 `image` 값에 예시처럼 경로를 입력합니다.

```json
{
  "date": "2026-06-10",
  "title": "새로운 추억 제목",
  "place": "장소",
  "category": "분류",
  "image": "assets/photos/example.jpg",
  "description": "짧은 설명"
}
```

## GitHub Pages 배포

GitHub 저장소의 `Settings` → `Pages`에서 `main` 브랜치와 `/root` 폴더를 선택하면
정적 홈페이지로 배포할 수 있습니다.
