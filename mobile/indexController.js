export class IndexController {
  constructor() {
    // Inject $localStorage as a dependency
    this.$localStorage = angular.injector(['ngStorage']).get('$localStorage');
  }
  doSomethingWithLocalStorage() {
    // Use $localStorage in your logic
    console.log(this.$localStorage.accessToken);
  }
}
