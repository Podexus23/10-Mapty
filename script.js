'use strict';
//TODO LIST
//!easy
//Ability to edit workout
//Ability to delete workout
//Ability to delete all workout
//Sort by distance or by duration
//rebuilt running and cycling objects coming from local storage, chain them to classes
//More realistic error and confirmation messages
//!hard
//ability to position the map to show all workouts
//Allow do draw lines and shapes instead of just points?
//!async
//Add geocode location from coordinates
//Display weather data for workout time and place

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
//sidebar modal window elements
const btnDeleteWorkouts = document.querySelector('.sidebar__btn--delete');
const sidebarModalEl = document.querySelector('.sidebar__modal');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; //[lat,lng]
    this.distance = distance; //in km
    this.duration = duration; //in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April',
                    'May', 'June', 'July', 'August', 'September',
      'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min  / km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km / h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run1 = new Running([52.4, 31], 5.2, 24, 178);
// const cycling1 = new Cycling([52.4, 31], 27, 95, 523);
// console.log(run1, cycling1);
///////////////////////////////////
//APPLICATION
class App {
  #map;
  #mapZoomLevel = 15;
  #mapEvent;
  #workouts = [];
  #markers = [];

  constructor() {
    this._getPosition();

    //Get data from local storage
    this._getLocalStorage();

    //Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);

    containerWorkouts.addEventListener(
      'click',
      this._sidebarHandler.bind(this)
    );
    btnDeleteWorkouts.addEventListener(
      'click',
      this._handleRemoveAllButton.bind(this)
    );
    sidebarModalEl.addEventListener(
      'click',
      this._handleRemoveAllModal.bind(this)
    );

    // containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), () => {
        return 'could not get your position';
      });
    }
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    //Clear input fields
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => {
      form.style.display = 'grid';
    });
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    e.preventDefault();

    //Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    //if workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      //check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        return alert('Inputs have to be positive numbers');
      }
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    //if workout cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      //check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      ) {
        return alert('Inputs have to be positive numbers');
      }
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    //add object to workout array
    this.#workouts.push(workout);

    //render workout on map as marker
    this._renderWorkoutMarker(workout);

    //render workout on list
    this._renderWorkout(workout);

    //hide form and clean inputs
    this._hideForm();

    //set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    const workoutMarker = L.marker(workout.coords);

    workoutMarker
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
    this.#markers.push({ marker: workoutMarker, id: workout.id });
  }

  _renderWorkout(workout, insert = true) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>`;
    if (workout.type == 'running') {
      html += `
      <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
          <span class="workout__btn--edit">
            <i class="btn--edit__icon">✏</i>
          </span>
          <span class="workout__btn--close">&times;</span>
        </li>`;
    }

    if (workout.type === 'cycling') {
      html += ` <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
          <span class="workout__btn--edit">
            <i class="btn--edit__icon">✏</i>
          </span>
          <span class="workout__btn--close">&times;</span>
        </li>`;
    }
    if (insert) form.insertAdjacentHTML('afterend', html);
    return html;
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: { duration: 1 },
    });

    //using public interface
    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;
    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }

  _sidebarHandler(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    const closeBtn = e.target.classList.contains('workout__btn--close');
    const editBtn = e.target.closest('.workout__btn--edit');
    if (closeBtn) {
      this._removeWorkout(e);
      return;
    }

    if (editBtn) {
      this._editWorkout(e);
      return;
    }

    //Move to popup event
    this._moveToPopup(e);
  }

  _removeWorkout(e) {
    //Check for clicked close btn
    const closeBtn = e.target.classList.contains('workout__btn--close');
    if (!closeBtn) return;

    //find id's and indexes of workout
    const workoutEl = e.target.closest('.workout');
    const id = workoutEl.dataset.id;
    const workoutIndex = this.#workouts.findIndex(e => e.id === id);
    const markerIndex = this.#markers.findIndex(e => e.id === id);
    const workout = this.#workouts[workoutIndex];
    const workMarker = this.#markers[markerIndex];

    //Remove workout map marker and from sidebar
    containerWorkouts.removeChild(workoutEl);
    workMarker.marker.removeFrom(this.#map);

    //Remove workout data from #workouts and #markers
    this.#workouts.splice(workoutIndex, 1);
    this.#markers.splice(markerIndex, 1);

    // set updated data for localStorage
    this._setLocalStorage();
  }

  _editWorkout(e) {
    const work = e.target.closest('.workout');

    //load form instead of work out on place of that workout
    const id = work.dataset.id;
    const data = this.#workouts.find(e => e.id === id);

    work.innerHTML = `
    <form class="workout__edit--form" data-id=${data.id}>
          <div class="form__row">
            <label class="form__label">Distance</label>
            <input type="number" class="form__input form__input--distance" placeholder="km" value="${
              data.distance
            }"/>
          </div>
          <div class="form__row">
            <label class="form__label">Duration</label>
            <input type="number" class="form__input form__input--duration"
              placeholder="min"
              value="${data.duration}"
            />
          </div>
          <div class="form__row">
            <label class="form__label">${
              data?.cadence ? 'Cadence' : 'Elevation'
            }</label>
            <input type="number" class="form__input form__input--${
              data?.cadence ? 'cadence' : 'elevation'
            }"
              placeholder="${data?.cadence ? 'step/min' : 'meters'}"
              value="${data?.cadence || data?.elevationGain}"
            />
          <button class="form__btn">OK</button>
        </form>`;

    //handle submit form
    const workForm = work.querySelector('.workout__edit--form');

    workForm.addEventListener('submit', e => {
      e.preventDefault();
      const editForm = e.target;

      data.distance = editForm[0].value;
      data.duration = editForm[1].value;
      if (data.type === 'running') {
        data.cadence = editForm[2].value;
        data.pace = data.duration / data.distance;
      } else {
        data.elevationGain = editForm[2].value;
        data.speed = data.distance / (data.duration / 60);
      }

      const workEl = new DOMParser()
        .parseFromString(this._renderWorkout(data, false), 'text/html')
        .querySelector('.workout');
      containerWorkouts.replaceChild(workEl, work);
    });

    /**
     * 1. add data of workout to inputs
     * 2. on submit reRender workout on the same place with new data
     * 3. renew data in #workouts
     */
  }

  _removeAllWorkouts() {
    //remove from workouts interface
    const workoutElems = containerWorkouts.querySelectorAll('.workout');
    workoutElems.forEach(elem => containerWorkouts.removeChild(elem));
    this.#markers.forEach(mark => {
      console.log(this);
      mark.marker.removeFrom(this.#map);
    });
    //remove workouts data from app
    this.#workouts = [];
    this.#markers = [];

    //update local storage
    this._setLocalStorage();
  }

  _handleRemoveAllButton(e) {
    sidebarModalEl.classList.remove('hidden');
  }

  _handleRemoveAllModal(e) {
    const closeModal = () => {
      sidebarModalEl.classList.add('hidden');
    };

    if (
      e.target.classList.contains('sidebar__modal') ||
      e.target.closest('.modal__button--no')
    ) {
      closeModal();
    }

    if (e.target.closest('.modal__button--yes')) {
      this._removeAllWorkouts();
      closeModal();
    }
  }
}
const app = new App();

`[
  {
    "date": "2023-08-15T13:57:50.795Z",
    "id": "2107870795",
    "clicks": 0,
    "coords": [
      52.42137140544184,
      30.973248481750492
    ],
    "distance": 12,
    "duration": 33,
    "type": "running",
    "cadence": 114,
    "pace": 2.75,
    "description": "Running on August 15"
  },
  {
    "date": "2023-08-15T13:57:58.027Z",
    "id": "2107878027",
    "clicks": 0,
    "coords": [
      52.41430442470195,
      31.01826667785645
    ],
    "distance": 331,
    "duration": 313,
    "type": "cycling",
    "elevationGain": 3331,
    "speed": 63.45047923322684,
    "description": "Cycling on August 15"
  },
  {
    "date": "2023-08-15T14:01:18.741Z",
    "id": "2108078741",
    "clicks": 0,
    "coords": [
      52.42553254201615,
      30.998697280883793
    ],
    "distance": 123,
    "duration": 313,
    "type": "running",
    "cadence": 414,
    "pace": 2.5447154471544717,
    "description": "Running on August 15"
  },
  {
    "date": "2023-08-15T14:01:22.701Z",
    "id": "2108082701",
    "clicks": 0,
    "coords": [
      52.42016748135835,
      30.994885996933917
    ],
    "distance": 12313,
    "duration": 1312,
    "type": "running",
    "cadence": 123123,
    "pace": 0.10655404856655568,
    "description": "Running on August 15"
  },
  {
    "date": "2023-08-15T14:01:27.782Z",
    "id": "2108087782",
    "clicks": 0,
    "coords": [
      52.4048014766754,
      30.971707856030175
    ],
    "distance": 1231,
    "duration": 12312,
    "type": "running",
    "cadence": 123123,
    "pace": 10.001624695369618,
    "description": "Running on August 15"
  },
  {
    "date": "2023-08-15T14:01:33.542Z",
    "id": "2108093542",
    "clicks": 0,
    "coords": [
      52.41048254848418,
      30.976938238041633
    ],
    "distance": 12312,
    "duration": 123123,
    "type": "running",
    "cadence": 123,
    "pace": 10.000243664717349,
    "description": "Running on August 15"
  },
  {
    "date": "2023-08-15T14:01:37.887Z",
    "id": "2108097887",
    "clicks": 0,
    "coords": [
      52.418727963759444,
      30.968697981019226
    ],
    "distance": 123123,
    "duration": 12312,
    "type": "running",
    "cadence": 12312,
    "pace": 0.09999756341219757,
    "description": "Running on August 15"
  },
  {
    "date": "2023-08-15T14:01:45.208Z",
    "id": "2108105208",
    "clicks": 0,
    "coords": [
      52.41713135290995,
      30.982517578733844
    ],
    "distance": 123123,
    "duration": 123123,
    "type": "running",
    "cadence": 123123,
    "pace": 1,
    "description": "Running on August 15"
  },
  {
    "date": "2023-08-15T14:03:13.434Z",
    "id": "2108193434",
    "clicks": 0,
    "coords": [
      52.412341173491896,
      30.95838586230301
    ],
    "distance": 123,
    "duration": 331,
    "type": "running",
    "cadence": 515,
    "pace": 2.6910569105691056,
    "description": "Running on August 15"
  }
]`;
