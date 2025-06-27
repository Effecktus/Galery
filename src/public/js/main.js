// Функция для отображения уведомлений
function showNotification(message, type = 'success') {
    const alertDiv = $('<div>', {
        class: `alert alert-${type} alert-dismissible fade show`,
        html: `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Закрыть">&times;</button>
        `
    });
    
    $('main').prepend(alertDiv);
    
    // Автоматически скрыть через 5 секунд
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Функция для форматирования даты
function formatDate(dateString) {
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
    };
    return new Date(dateString).toLocaleDateString('ru-RU', options);
}

// Функция для форматирования цены
function formatPrice(price) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB'
    }).format(price);
}

// Функция для форматирования времени без секунд
function formatTime(timeString) {
  if (!timeString) return '';
  return timeString.slice(0,5);
}

// Инициализация при загрузке страницы
$(document).ready(function() {
    // Обработка AJAX форм
    $('form[data-ajax="true"]').on('submit', function(e) {
        e.preventDefault();
        
        const form = $(this);
        // Если есть input[type=file], используем FormData, иначе serialize
        let formData;
        if (form.find('input[type="file"]').length > 0) {
            formData = new FormData(this);
        } else {
            formData = form.serialize();
        }
        const submitButton = form.find('[type="submit"]');
        const originalButtonText = submitButton.html();
        
        submitButton.prop('disabled', true).html('Загрузка...');
        
        $.ajax({
            url: form.attr('action'),
            method: form.attr('method'),
            data: formData,
            // Только если есть файл — processData/contentType false
            ...(form.find('input[type="file"]').length > 0 ? { processData: false, contentType: false } : {}),
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            },
            success: function(data) {
                alert( 'Операция выполнена успешно');
                if (form.attr('id') === 'buy-ticket-form') {
                    const quantity = parseInt(form.find('input[name="quantity"]').val(), 10);
                    const leftSpan = $(form).closest('.exhibition-info-col').find('p:contains("Осталось билетов")');
                    if (leftSpan.length) {
                        // Извлекаем текущее значение
                        const match = leftSpan.text().match(/(\d+)/);
                        if (match) {
                            let left = parseInt(match[1], 10);
                            left = Math.max(0, left - quantity);
                            leftSpan.html(`<strong>Осталось билетов:</strong> ${left}`);
                        }
                    }
                }
                if (data.redirect) {
                    window.location.href = data.redirect;
                }
            },
            error: function(xhr) {
                const response = xhr.responseJSON;
                showNotification(response?.message || 'Произошла ошибка', 'danger');
            },
            complete: function() {
                submitButton.prop('disabled', false).html(originalButtonText);
            }
        });
    });

    // Обработка кнопки выхода
    $('a[data-action="logout"]').on('click', function(e) {
        e.preventDefault();
        window.location.href = '/auth/logout';
    });

    // Обработка мобильного меню
    $('.menu-toggle').on('click', function() {
        $('.main-nav').toggleClass('active');
    });
});

// Функция для загрузки изображений с предпросмотром
function handleImageUpload(input, previewElement) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            previewElement.src = e.target.result;
            previewElement.style.display = 'block';
        };
        
        reader.readAsDataURL(input.files[0]);
    }
}

document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('exhibition-filter-form');
  const list = document.getElementById('exhibitions-list');
  const noMsg = document.getElementById('no-exhibitions-message');

  function renderExhibitions(exhibitions) {
    list.innerHTML = '';
    if (!exhibitions.length) {
      list.style.display = 'none';
      noMsg.style.display = 'block';
      return;
    }
    list.style.display = 'grid';
    noMsg.style.display = 'none';
    exhibitions.forEach(exh => {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.justifyContent = 'space-between';
      card.innerHTML = `
        <div class=\"card-header\"><h4>${exh.title}</h4></div>
        ${exh.poster_path ? `<img src=\"${exh.poster_path}\" class=\"exhibition-poster\" style=\"width:100%;height:180px;object-fit:cover;\" alt=\"Афиша выставки\">` : ''}
        <div class=\"card-body\">
          <p><strong>Место:</strong> ${exh.location || '-'}<\/p>
          <p><strong>Описание:</strong> ${exh.description || '-'}<\/p>
          <p><strong>Цена билета:</strong> ${exh.ticket_price ? exh.ticket_price + ' ₽' : 'Бесплатно'}<\/p>
          <p><strong>Даты:</strong> ${formatDate(exh.start_date)} — ${formatDate(exh.end_date)}<\/p>
        <\/div>
        <div style=\"padding:1rem; text-align:right;\">
          <a href=\"/exhibitions/${exh.id}/page" class=\"btn btn-primary\">Подробнее<\/a>
        <\/div>
      `;
      list.appendChild(card);
    });
  }

  function fetchExhibitions(params = {}) {
    const url = '/api/v1/exhibitions/public';
    const queryParams = $.param(params);
    const fullUrl = queryParams ? `${url}?${queryParams}` : url;
    
    $('#exhibitions-list').html('<div style="grid-column:1/-1;text-align:center;padding:2rem;">Загрузка...</div>');
    $('#no-exhibitions-message').hide();
    
    $.ajax({
      url: fullUrl,
      method: 'GET',
      dataType: 'json',
      success: function(data) {
        if (data.status === 'success') {
          renderExhibitions(data.data.exhibitions);
        } else {
          $('#exhibitions-list').html('');
          $('#no-exhibitions-message').show();
        }
      },
      error: function(xhr, status, error) {
        console.error('Ошибка при загрузке выставок:', error);
        $('#exhibitions-list').html('');
        $('#no-exhibitions-message').show();
      }
    });
  }

  // Сбор параметров фильтра
  function getFilterParams() {
    return {
      search: $('#search').val().trim(),
      start_date: $('#start_date').val(),
      end_date: $('#end_date').val(),
      min_price: $('#min_price').val(),
      max_price: $('#max_price').val()
    };
  }

  // Обработчик отправки формы
  $('#exhibition-filter-form').on('submit', function (e) {
    e.preventDefault();
    fetchExhibitions(getFilterParams());
  });

  // Автозагрузка при изменении фильтров
  $('#search, #start_date, #end_date, #min_price, #max_price').on('input change', function () {
    fetchExhibitions(getFilterParams());
  });

  // Первая загрузка
  fetchExhibitions();
}); 