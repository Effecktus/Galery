$(document).ready(function () {
  // Открытие модального окна и заполнение формы
  $('#editProfileBtn').on('click', function () {
    $('#editProfileSurname').val($('#profileSurname').text());
    $('#editProfileFirstName').val($('#profileFirstName').text());
    $('#editProfilePatronymic').val($('#profilePatronymic').text());
    $('#editProfileEmail').val($('#profileEmail').text());
    $('#editProfilePassword').val('');
    $('#editProfilePasswordConfirm').val('');
    clearErrors();
    $('#editProfileModal').addClass('active');
  });

  // Закрытие модального окна
  $('.modal-close').on('click', function () {
    $(this).closest('.modal').removeClass('active');
  });

  // Блокируем дефолтный сабмит формы, чтобы не было перезагрузки
  $('#editProfileForm').on('submit', function(e) {
    e.preventDefault();
  });

  // Сохранить изменения
  $('#saveProfileBtn').on('click', function () {
    const errors = validateProfileForm();
    if (errors.length > 0) {
      showErrors(errors);
      return;
    }
    updateProfile();
  });
});

function clearErrors() {
  $('.error-message').text('');
  $('.form-group').removeClass('error');
  $('.form-group input').removeClass('error');
}

function showErrors(errors) {
  clearErrors();
  errors.forEach(({ field, message }) => {
    const input = $('#' + field);
    const formGroup = input.closest('.form-group');
    formGroup.addClass('error');
    input.addClass('error');
    $('#' + field + 'Error').text(message);
  });
}

function validateProfileForm() {
  const surname  = $('#editProfileSurname').val().trim();
  const first    = $('#editProfileFirstName').val().trim();
  const patronym = $('#editProfilePatronymic').val().trim();
  const email    = $('#editProfileEmail').val().trim();
  const pass     = $('#editProfilePassword').val();
  const pass2    = $('#editProfilePasswordConfirm').val();

  const errors = [];

  // Фамилия: 2–50 символов, только буквы и дефис
  if (!surname) {
    errors.push({ field: 'editProfileSurname', message: 'Фамилия обязательна' });
  } else if (surname.length < 2 || surname.length > 50) {
    errors.push({ field: 'editProfileSurname', message: 'Должна быть от 2 до 50 символов' });
  } else if (!/^[A-Za-zА-Яа-яЁё-]+$/.test(surname)) {
    errors.push({ field: 'editProfileSurname', message: 'Только буквы и дефис' });
  }

  // Имя: 2–50 символов, только буквы и дефис
  if (!first) {
    errors.push({ field: 'editProfileFirstName', message: 'Имя обязательно' });
  } else if (first.length < 2 || first.length > 50) {
    errors.push({ field: 'editProfileFirstName', message: 'Должно быть от 2 до 50 символов' });
  } else if (!/^[A-Za-zА-Яа-яЁё-]+$/.test(first)) {
    errors.push({ field: 'editProfileFirstName', message: 'Только буквы и дефис' });
  }

  // Отчество: если указано, 2–50 символов, только буквы и дефис
  if (patronym) {
    if (patronym.length < 2 || patronym.length > 50) {
      errors.push({ field: 'editProfilePatronymic', message: 'Должно быть от 2 до 50 символов' });
    } else if (!/^[A-Za-zА-Яа-яЁё-]+$/.test(patronym)) {
      errors.push({ field: 'editProfilePatronymic', message: 'Только буквы и дефис' });
    }
  }

  // Email: 5–100 символов, валидный формат
  if (!email) {
    errors.push({ field: 'editProfileEmail', message: 'Email обязателен' });
  } else if (email.length < 5 || email.length > 100) {
    errors.push({ field: 'editProfileEmail', message: 'От 5 до 100 символов' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push({ field: 'editProfileEmail', message: 'Неверный формат email' });
  }

  // Пароль: если меняем, >=8 и совпадает с подтверждением
  if (pass) {
    if (pass.length < 8) {
      errors.push({ field: 'editProfilePassword', message: 'Не менее 8 символов' });
    }
    if (!pass2) {
      errors.push({ field: 'editProfilePasswordConfirm', message: 'Подтвердите пароль' });
    } else if (pass !== pass2) {
      errors.push({ field: 'editProfilePasswordConfirm', message: 'Пароли не совпадают' });
    }
  }

  return errors;
}

function updateProfile() {
  const data = {
    surname:  $('#editProfileSurname').val().trim(),
    first_name: $('#editProfileFirstName').val().trim(),
    patronymic: ($('#editProfilePatronymic').val().trim() || null),
    email:      $('#editProfileEmail').val().trim()
  };
  const pass = $('#editProfilePassword').val();
  if (pass) data.password = pass;

  $.ajax({
    url: '/api/v1/users/me',
    method: 'PATCH',
    contentType: 'application/json',
    data: JSON.stringify(data),
    success(response) {
      if (response.status === 'success') {
        const u = response.data.user;
        $('#profileSurname').text(u.surname);
        $('#profileFirstName').text(u.first_name);
        $('#profilePatronymic').text(u.patronymic || '');
        $('#profileEmail').text(u.email);
        $('#editProfileModal').removeClass('active');
        clearErrors();
        alert('Профиль успешно обновлен');
      }
    },
    error(xhr) {
      if (xhr.status === 401) {
        window.location.href = '/auth/login';
      } else if (xhr.status === 400) {
        const resp = xhr.responseJSON;
        if (resp.errors && resp.errors.length) {
          showErrors(resp.errors);
        } else {
          alert(resp.message || 'Ошибка при обновлении профиля');
        }
      } else {
        alert('Ошибка при обновлении профиля');
      }
    }
  });
}
