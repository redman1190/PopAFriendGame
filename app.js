(function(){
  const MAX_PHOTOS = 5;
  const GAME_DURATION = 30; // seconds
  const SPAWN_MS = 700;     // spawn interval
  const LS_HIGH = 'popafriend_highscore';

  // data URLs
  let photos = [];
  let score = 0;
  let timeLeft = GAME_DURATION;
  let timerId = null, spawnId = null;
  let running = false;

  // Cache jQuery elements
  const $mainCard = $('#mainCard');
  const $howtoWrapper = $('.howto-wrapper');
  const $howtoBtn = $('#howtoBtn');
  const $howtoPanel = $('#howtoPanel');

  const $game = $('#gameArea');
  const $score = $('#score');
  const $time = $('#time');
  const $overlay = $('#overlay');
  const $final = $('#finalScore');
  const $strip = $('#avatarStrip');
  const $high = $('#highScore');

  // Load preferences
  loadHighScore();
  // Intro page flip + slideDown
  $('#startIntro').on('click', function(){
    $('#introPage').addClass('flip');

    // After flip completes, slide down How-To & main card
    setTimeout(() => {
      // show howto wrapper first
      $howtoWrapper.hide().slideDown(350);
      $mainCard.hide().slideDown(400);
    }, 820);
  });

  // How-to toggler uses slideDown/slideUp
  $howtoBtn.on('click', function(){
    $howtoPanel.slideToggle(220);
    // rotate caret feel: just swap text arrow
    const t = $(this).text().includes('▸') ? 'How to play ▾' : 'How to play ▸';
    $(this).text(t);
  });

  // Animation helpers ensure elements using flex display fade correctly.
  // Ensure elements that rely on `display:flex` get that display value and
  // always end with opacity 1 when shown (fixes invisible-but-clickable balloons).
  function fxFadeIn($el, dur){
    // Ensure correct display for flex elements, reset opacity and animate to 1.
    // Use a completion callback to guarantee the final opacity and display.
    $el.stop(true).css('display', 'flex').css('opacity', 0).animate({ opacity: 1 }, dur, function(){
      $(this).css({ opacity: 1, display: 'flex' });
    });
  }
  function fxFadeOut($el, dur, done){
    $el.stop(true).animate({ opacity: 0 }, dur, function(){ $(this).hide(); done && done(); });
  }
  function fxAnimate($el, props, opts){
    $el.animate(props, opts);
  }
  function fxSlideDown($el, dur){ $el.slideDown(dur); }

  // Device upload
  $('#fileInput').on('change', function(e){
    const files = Array.from(e.target.files).slice(0, MAX_PHOTOS - photos.length);
    if (!files.length) return;
    let pending = files.length;
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = evt => { addPhoto(evt.target.result); if (--pending===0) refreshStrip(); };
      reader.readAsDataURL(file);
    });
  });

  function addPhoto(dataUrl){
    if (photos.length >= MAX_PHOTOS) return;
    photos.push(dataUrl);
  }
  function refreshStrip(){
    $strip.empty();
    photos.forEach(src => {
      const div = $('<div class="avatar"></div>').css('background-image', `url("${src}")`);
      $strip.append(div);
    });
  }

  // Start / Play again
  $('#startBtn').on('click', startGame);
  $('#playAgain').on('click', startGame);

  function startGame(){
    running = true; score = 0; timeLeft = GAME_DURATION;
    $score.text(score); $time.text(timeLeft);

    fxFadeOut($overlay, 200);
    $game.find('.balloon').remove();
    clearInterval(timerId); clearInterval(spawnId);

    // Countdown
    timerId = setInterval(() => {
      timeLeft--; $time.text(timeLeft);
      if (timeLeft <= 0) endGame();
    }, 1000);

    // Spawn balloons
    spawnId = setInterval(spawnBalloon, SPAWN_MS);
  }

  function endGame(){
    running = false; clearInterval(timerId); clearInterval(spawnId);
    // fade out remaining balloons
    $game.find('.balloon').each(function(){
      fxFadeOut($(this), 200, function(){ $(this).remove(); });
    });

    $final.text(score);
    fxFadeIn($overlay, 250);

    // High Score logic
    const old = getHighScore();
    if (score > old) {
      setHighScore(score);
      $high.text(score);
    }
  }

  // High Score (localStorage)
  function getHighScore(){
    const v = localStorage.getItem(LS_HIGH);
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  function setHighScore(n){
    localStorage.setItem(LS_HIGH, String(n));
  }
  function loadHighScore(){
    $high.text(getHighScore());
  }

  // Balloon spawning
  function spawnBalloon(){
    if (!running) return;
    const areaW = $game.innerWidth(), areaH = $game.innerHeight();
    const x = Math.max(8, Math.floor(Math.random() * (areaW - 98)));
    const duration = 3500 + Math.random()*2500;
    const img = photos.length ? photos[Math.floor(Math.random()*photos.length)] : null;

    const $b = $('<div class="balloon" aria-label="balloon"></div>').css({ left: x + 'px', opacity: 0, bottom: -120 });
    const $face = $('<div class="face"></div>');
    if (img) $face.css('background-image', `url("${img}")`);
    $b.append($face).appendTo($game);

    // appear
    fxFadeIn($b, 120);

    // float up
    fxAnimate($b, { bottom: areaH + 140 }, {
      duration,
      easing: 'swing',
      complete: function(){ $(this).remove(); }
    });

    // pop on click (balloon body or face)
    const handlePop = function(e){
      e.preventDefault();
      e.stopPropagation();
      popBalloon($(this).closest('.balloon'));
    };
    $b.on('click', handlePop);
    $face.on('click', handlePop);
  }

  function popBalloon($balloon){
    if (!running || !$balloon || !$balloon.length) return;
    if ($balloon.data('popped')) return;
    $balloon.data('popped', true);
    score++; $score.text(score);

    $balloon.stop(true);
    fxFadeOut($balloon, 140, function(){ $(this).remove(); });
  }
})();
