enum PurchaseState: Equatable {
    case idle
    case purchasing
    case succeeded
    case pending
    case cancelled
    case failed(String)
}
