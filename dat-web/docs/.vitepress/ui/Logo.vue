<!-- DAT 마크. 다섯 조각 링은 토큰의 다섯 필드(expire·cid·plain·secure·signature)이고,
     가운데 체크는 그 다섯이 스스로를 검증한다는 뜻이다.

     같은 도형이 origin/ci/mark.svg에도 있고 docs/public의 파비콘·OG가 전부 거기서
     나온다. 도형을 바꾸면 양쪽을 같이 고치고 `npm run assets`로 다시 뽑아야 한다.

     <img src="/dat.svg">가 아니라 인라인인 이유는 요청을 하나 아끼려는 것도 있지만,
     체크 색을 테마에 맞춰 바꿔야 해서다 — 외부 SVG는 페이지 테마를 못 따라온다. -->
<template>
  <svg viewBox="0 0 512 512" aria-hidden="true" focusable="false" class="shrink-0">
    <g transform="rotate(-90 256 256)" fill="none" stroke-width="80" stroke-dasharray="195.3 1011.1">
      <circle cx="256" cy="256" r="192" stroke="#0f766e" stroke-dashoffset="0" />
      <circle cx="256" cy="256" r="192" stroke="#12837a" stroke-dashoffset="-241.3" />
      <circle cx="256" cy="256" r="192" stroke="#4f46e5" stroke-dashoffset="-482.5" />
      <circle cx="256" cy="256" r="192" stroke="#c23b82" stroke-dashoffset="-723.8" />
      <circle cx="256" cy="256" r="192" stroke="#6ba30f" stroke-dashoffset="-965.1" />
    </g>
    <path class="check" d="M182 260 L234 312 L338 190" fill="none" stroke-width="52"
          stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>

<style scoped>
/* 링은 다섯 색이 서로를 받쳐 줘서 어느 바탕에서도 읽히지만, 체크는 가운데 빈 곳에
   혼자 놓인다. 라이트에서 라임(#84cc16)은 흰 바탕에 거의 묻히므로 한 단계 내리고,
   다크에서는 반대로 올린다. */
.check {
  stroke: #4d7c0f;
}

html.dark .check {
  stroke: #a3e635;
}
</style>
